import { rejectLargeBody, setSecurityHeaders } from './_security';
import { createHmac, randomInt } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const otpSecret = process.env.SIGNUP_OTP_SECRET;
const ipHashSecret = process.env.IP_HASH_SECRET || process.env.SIGNUP_OTP_SECRET;
const fromEmail = process.env.AUTH_EMAIL_FROM || process.env.ORDER_EMAIL_FROM;
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'https://aabnoor.shop,https://www.aabnoor.shop')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cleanText = (value: unknown, maxLength: number) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const hashOtp = (email: string, otp: string) =>
  createHmac('sha256', otpSecret || '')
    .update(`${email.toLowerCase()}:${otp}`)
    .digest('hex');

const hashIp = (ip: string) =>
  ip
    ? createHmac('sha256', ipHashSecret || '').update(ip).digest('hex')
    : null;

const setCorsHeaders = (req: any, res: any) => {
  const origin = String(req.headers.origin || '');
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
};

export default async function handler(req: any, res: any) {
  setSecurityHeaders(res);
  if (rejectLargeBody(req, res)) return;
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!String(req.headers['content-type'] || '').includes('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }

  if (!supabaseUrl || !supabaseSecretKey || !resendApiKey || !otpSecret || !fromEmail) {
    return res.status(500).json({ error: 'Signup email service is not configured.' });
  }

  const email = cleanText(req.body?.email, 254).toLowerCase();
  const name = cleanText(req.body?.name, 120);
  const requestIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim();
  const requestIpHash = hashIp(requestIp);

  if (!name || name.length > 120) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: existingCustomer } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('data->>email', email)
    .maybeSingle();

  if (existingCustomer) {
    return res.status(200).json({ ok: true });
  }

  const recentWindow = new Date(Date.now() - 60_000).toISOString();
  const { data: recentOtp, error: recentError } = await supabaseAdmin
    .from('signup_otps')
    .select('id')
    .eq('email', email)
    .gte('created_at', recentWindow)
    .is('consumed_at', null)
    .limit(1);

  if (recentError) {
    return res.status(500).json({ error: 'OTP request could not be checked.' });
  }

  if (recentOtp && recentOtp.length > 0) {
    return res.status(429).json({ error: 'Please wait one minute before requesting another OTP.' });
  }

  if (requestIpHash) {
    const { count, error: ipError } = await supabaseAdmin
      .from('signup_otps')
      .select('id', { count: 'exact', head: true })
      .eq('request_ip_hash', requestIpHash)
      .gte('created_at', new Date(Date.now() - 10 * 60_000).toISOString());

    if (ipError) {
      return res.status(500).json({ error: 'OTP request could not be checked.' });
    }

    if ((count || 0) >= 5) {
      return res.status(429).json({ error: 'Too many OTP requests. Please try again later.' });
    }
  }

  const otp = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

  const { error: insertError } = await supabaseAdmin
    .from('signup_otps')
    .insert({
      email,
      name,
      otp_hash: hashOtp(email, otp),
      expires_at: expiresAt,
      request_ip_hash: requestIpHash,
    });

  if (insertError) {
    return res.status(500).json({ error: 'OTP could not be saved.' });
  }

  const resend = new Resend(resendApiKey);
  const { error: emailError } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: 'Your Aabnoor verification code',
    html: `
      <div style="margin:0;background:#f7f3ee;padding:32px 16px;font-family:Arial,sans-serif;color:#1a1a1a;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eadfd6;border-radius:18px;overflow:hidden;">
          <div style="background:#1a1a1a;padding:28px 32px;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:34px;font-style:italic;color:#ffffff;letter-spacing:.02em;">Aabnoor</div>
            <div style="margin-top:8px;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:#cda185;">Secure Email Verification</div>
          </div>

          <div style="padding:34px 32px;text-align:center;">
            <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#1a1a1a;">Your verification code is this</h1>
            <p style="margin:0 auto 26px;max-width:390px;font-size:14px;line-height:1.7;color:#5f5a55;">Enter this one-time code to verify ${escapeHtml(email)} and finish creating your Aabnoor account.</p>

            <div style="display:inline-block;background:#f7f3ee;border:1px solid #e6d6ca;border-radius:14px;padding:18px 24px;margin-bottom:24px;">
              <div style="font-size:36px;line-height:1;font-weight:700;letter-spacing:12px;color:#1a1a1a;font-family:Arial,sans-serif;">${otp}</div>
            </div>

            <p style="margin:0;font-size:13px;color:#7a736c;">This code expires in 10 minutes.</p>
          </div>

          <div style="border-top:1px solid #eadfd6;padding:18px 32px;text-align:center;background:#fbfaf8;">
            <p style="margin:0;font-size:11px;line-height:1.6;color:#8a8179;">If you did not request this code, you can safely ignore this email.</p>
          </div>
        </div>
      </div>
    `,
  });

  if (emailError) {
    return res.status(400).json({ error: 'Verification email could not be sent.' });
  }

  return res.status(200).json({ ok: true });
}
