import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'junaidmushtaq988@gmail.com';
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const allowedStatuses = new Set(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded']);

const cleanText = (value: unknown, maxLength: number) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const decodeJwtPayload = (token: string) => {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    return JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseSecretKey || !supabasePublishableKey) {
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
  if (userError || !user?.id || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Only the configured admin can update orders.' });
  }

  const tokenClaims = decodeJwtPayload(token);
  if (tokenClaims?.aal !== 'aal2') {
    return res.status(403).json({ error: 'Authenticator verification is required before updating orders.' });
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
