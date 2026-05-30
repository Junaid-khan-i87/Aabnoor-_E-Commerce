import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { cleanText } from './_security';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const otpSecret = process.env.SIGNUP_OTP_SECRET;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashOtp = (email: string, otp: string) =>
  createHmac('sha256', otpSecret || '')
    .update(`${email.toLowerCase()}:${otp}`)
    .digest('hex');

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseSecretKey || !otpSecret) {
    return res.status(500).json({ error: 'Signup verification is not configured.' });
  }

  const email = cleanText(req.body?.email, 254).toLowerCase();
  const name = cleanText(req.body?.name, 120);
  const password = String(req.body?.password || '');
  const otp = String(req.body?.otp || '').replace(/\D/g, '');

  if (!name || name.length > 120) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Enter the 6-digit OTP from your email.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: otpRows, error: otpError } = await supabaseAdmin
    .from('signup_otps')
    .select('id,otp_hash,attempts,expires_at,consumed_at')
    .eq('email', email)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (otpError) {
    return res.status(500).json({ error: 'OTP could not be verified.' });
  }

  const otpRow = otpRows?.[0];
  if (!otpRow) {
    return res.status(400).json({ error: 'OTP expired or not found. Request a new code.' });
  }

  if (Number(otpRow.attempts || 0) >= 5) {
    return res.status(429).json({ error: 'Too many OTP attempts. Request a new code.' });
  }

  if (otpRow.otp_hash !== hashOtp(email, otp)) {
    await supabaseAdmin
      .from('signup_otps')
      .update({ attempts: Number(otpRow.attempts || 0) + 1 })
      .eq('id', otpRow.id);
    return res.status(400).json({ error: 'Invalid OTP code.' });
  }

  const createdUser = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
    },
  });

  if (createdUser.error) {
    return res.status(400).json({ error: 'Account could not be created.' });
  }

  const user = createdUser.data.user;
  const customer = {
    id: `USR-${user.id}`,
    email,
    name,
    coins: 0,
    joined: new Date().toISOString().slice(0, 10),
    warnings: 0,
    status: 'Active',
  };

  const { error: customerError } = await supabaseAdmin
    .from('customers')
    .upsert({ id: customer.id, data: customer });

  if (customerError) {
    return res.status(500).json({ error: 'Customer profile could not be saved.' });
  }

  await supabaseAdmin
    .from('signup_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', otpRow.id);

  return res.status(200).json({ ok: true });
}
