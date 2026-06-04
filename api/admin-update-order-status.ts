import { rejectLargeBody, setSecurityHeaders } from './_security';
import { createClient } from '@supabase/supabase-js';
import { requireAdminSession } from './_adminAuth';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'https://aabnoor.shop,https://www.aabnoor.shop')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedStatuses = new Set(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded']);

const cleanText = (value: unknown, maxLength: number) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

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

  if (!supabaseUrl || !supabaseSecretKey) {
    return res.status(500).json({ error: 'Admin order service is not configured.' });
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Missing admin session.' });
  }

  const orderId = cleanText(req.body?.orderId, 80);
  const status = cleanText(req.body?.status, 40);
  const note = cleanText(req.body?.note || `Order marked as ${status}`, 300);
  const coinsAdded = typeof req.body?.coinsAdded === 'boolean' ? req.body.coinsAdded : undefined;

  if (!orderId || orderId.length > 80 || !allowedStatuses.has(status)) {
    return res.status(400).json({ error: 'A valid order id and status are required.' });
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

  if (!orderRow?.data) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const order = orderRow.data;
  const nextOrder = {
    ...order,
    id: order.id || orderRow.id,
    status,
    ...(coinsAdded !== undefined ? { coinsAdded } : {}),
    trackingUpdates: [
      ...(Array.isArray(order.trackingUpdates) ? order.trackingUpdates : []),
      { status, date: new Date().toISOString(), note },
    ],
  };

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ data: nextOrder })
    .eq('id', orderId);

  if (updateError) {
    return res.status(500).json({ error: 'Order status could not be saved.' });
  }

  return res.status(200).json({ order: nextOrder });
}
