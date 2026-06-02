import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// ORDER_EMAIL_FROM must be set to a verified Resend domain address, e.g. noreply@aabnoor.shop
// Configure at: https://resend.com/domains
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.ORDER_EMAIL_FROM;
const trackingUrl = process.env.ORDER_TRACKING_URL || 'https://aabnoor.shop/track';
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'https://aabnoor.shop,https://www.aabnoor.shop')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

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
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!String(req.headers['content-type'] || '').includes('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }

  if (!supabaseUrl || !supabaseKey || !supabaseSecretKey || !resendApiKey || !fromEmail) {
    return res.status(500).json({ error: 'Email service is not configured.' });
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Missing user session.' });
  }

  const { orderId } = req.body || {};
  if (!orderId || typeof orderId !== 'string' || orderId.length > 80) {
    return res.status(400).json({ error: 'A valid order id is required.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser(token);
  const user = userResult?.user;
  if (userError || !user?.email) {
    return res.status(401).json({ error: 'Invalid user session.' });
  }

  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .select('id,data')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    return res.status(400).json({ error: 'Order could not be loaded.' });
  }

  const order = orderRow?.data;
  if (!order || order.userEmail !== user.email) {
    return res.status(404).json({ error: 'Order not found for this user.' });
  }

  if (order.confirmationEmailSent === true) {
    return res.status(200).json({ alreadySent: true });
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsHtml = items
    .map((item: any) => {
      const name = escapeHtml(item.name);
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      return `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">${name}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${quantity}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">Rs. ${(price * quantity).toFixed(2)}</td></tr>`;
    })
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1A1A1A;line-height:1.5;max-width:640px;margin:0 auto;padding:24px;">
      <h1 style="font-family:Georgia,serif;font-weight:400;">Aabnoor order confirmation</h1>
      <p>Thank you for your purchase, ${escapeHtml(order.userName || user.email)}.</p>
      <p><strong>Order:</strong> ${escapeHtml(order.id)}</p>
      <p><strong>Tracking:</strong> ${escapeHtml(order.trackingNumber || 'Pending')}</p>
      <div style="background:#f7f3ee;border:1px solid #eadfd6;padding:16px 18px;margin:18px 0 24px;">
        <p style="margin:0 0 12px;font-size:14px;">Track your order anytime using your tracking number.</p>
        <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Track your order</a>
        <p style="margin:12px 0 0;font-size:12px;color:#666;">Tracking page: <a href="${escapeHtml(trackingUrl)}" style="color:#1A1A1A;">${escapeHtml(trackingUrl)}</a></p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;">
        <thead>
          <tr>
            <th style="text-align:left;border-bottom:2px solid #1A1A1A;padding-bottom:8px;">Item</th>
            <th style="text-align:center;border-bottom:2px solid #1A1A1A;padding-bottom:8px;">Qty</th>
            <th style="text-align:right;border-bottom:2px solid #1A1A1A;padding-bottom:8px;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <p style="font-size:18px;"><strong>Total:</strong> Rs. ${Number(order.total || 0).toFixed(2)}</p>
      <p style="white-space:pre-line;"><strong>Shipping:</strong><br>${escapeHtml(order.shippingAddress || '')}</p>
      <p style="color:#666;font-size:12px;">This email was sent automatically by Aabnoor.</p>
    </div>
  `;

  const resend = new Resend(resendApiKey);
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: user.email,
    subject: `Aabnoor order confirmation ${order.id}`,
    html,
  });

  if (error) {
    return res.status(400).json({ error: 'Order confirmation email could not be sent.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  void Promise.resolve(
    supabaseAdmin
      .from('orders')
      .update({ data: { ...order, confirmationEmailSent: true } })
      .eq('id', orderId)
  )
    .then(({ error: updateError }) => {
      if (updateError) console.error(updateError);
    })
    .catch(console.error);

  return res.status(200).json({ id: data?.id });
}
