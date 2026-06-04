import { rejectLargeBody, setSecurityHeaders } from './_security';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { requireAdminSession } from './_adminAuth';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.ORDER_EMAIL_FROM;
const trackingUrl = process.env.ORDER_TRACKING_URL || 'https://aabnoor.shop/track';
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'https://aabnoor.shop,https://www.aabnoor.shop')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

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

  if (!supabaseUrl || !supabaseSecretKey || !resendApiKey || !fromEmail) {
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

  const adminSession = await requireAdminSession(req);
  if ('failure' in adminSession) {
    return res.status(adminSession.failure.status).json(adminSession.failure.body);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

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

  if (order.deliveryEmailSent === true) {
    return res.status(200).json({ alreadySent: true });
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

  void Promise.resolve(
    supabaseAdmin
      .from('orders')
      .update({ data: { ...order, deliveryEmailSent: true } })
      .eq('id', orderId)
  )
    .then(({ error: updateError }) => {
      if (updateError) console.error(updateError);
    })
    .catch(console.error);

  return res.status(200).json({ id: data?.id, to: order.userEmail });
}
