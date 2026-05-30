import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.ORDER_EMAIL_FROM || 'Aabnoor <noreply@aabnoor.shop>';
const trackingUrl = process.env.ORDER_TRACKING_URL || 'https://aabnoor.shop/track';

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

const decodeJwtPayload = (token: string) => {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    return JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

const setCorsHeaders = (res: any) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://aabnoor.shop');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
};

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!String(req.headers['content-type'] || '').includes('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }

  if (!supabaseUrl || !supabaseSecretKey || !supabasePublishableKey || !resendApiKey) {
    return res.status(500).json({ error: 'Delivery email service is not configured.' });
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Missing admin session.' });
  }

  const orderId = cleanText(req.body?.orderId, 80);
  if (!orderId || orderId.length > 80) {
    return res.status(400).json({ error: 'A valid order id is required.' });
  }

  const userClient = createClient(supabaseUrl, supabasePublishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: userResult, error: userError } = await userClient.auth.getUser(token);
  const user = userResult?.user;
  if (userError || !user?.id || !ADMIN_EMAIL || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Only the configured admin can send order emails.' });
  }

  const tokenClaims = decodeJwtPayload(token);
  if (tokenClaims?.aal !== 'aal2') {
    return res.status(403).json({ error: 'Authenticator verification is required before sending order emails.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: adminRow, error: adminError } = await supabaseAdmin
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    return res.status(403).json({ error: 'Admin account is not registered.' });
  }

  const { data: orderRow, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id,data')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    return res.status(500).json({ error: 'Order could not be loaded.' });
  }

  const order = orderRow?.data;
  if (!order?.userEmail) {
    return res.status(404).json({ error: 'Order email address was not found.' });
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsHtml = items
    .map((item: any) => {
      const name = escapeHtml(item.name);
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      return `<tr><td style="padding:10px 0;border-bottom:1px solid #eee;">${name}</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center;">${quantity}</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;">Rs. ${(price * quantity).toFixed(2)}</td></tr>`;
    })
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1A1A1A;line-height:1.6;max-width:640px;margin:0 auto;padding:26px;">
      <p style="margin:0 0 10px;color:#CDA185;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;">Order delivered</p>
      <h1 style="font-family:Georgia,serif;font-weight:400;margin:0 0 18px;">Your Aabnoor order has been delivered</h1>
      <p>Hi ${escapeHtml(order.userName || order.userEmail)},</p>
      <p>Your order has been marked as delivered. Thank you for shopping with Aabnoor.</p>
      <div style="background:#f7f3ee;border:1px solid #eadfd6;padding:16px 18px;margin:20px 0;">
        <p style="margin:0 0 8px;"><strong>Order:</strong> ${escapeHtml(order.id || orderRow.id)}</p>
        <p style="margin:0 0 14px;"><strong>Tracking:</strong> ${escapeHtml(order.trackingNumber || 'Pending')}</p>
        <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">View tracking page</a>
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
      <p style="color:#666;font-size:12px;">If you did not receive your parcel, reply to this email with your order number.</p>
    </div>
  `;

  const resend = new Resend(resendApiKey);
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: order.userEmail,
    subject: `Your Aabnoor order was delivered ${order.id || orderRow.id}`,
    html,
  });

  if (error) {
    return res.status(400).json({ error: 'Delivery email could not be sent.' });
  }

  return res.status(200).json({ id: data?.id, to: order.userEmail });
}
