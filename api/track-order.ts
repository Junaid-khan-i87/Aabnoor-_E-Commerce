import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

const trackingRegex = /^[A-Z]{2}-\d{2}-\d{7}$/i;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'https://aabnoor.shop,https://www.aabnoor.shop')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

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

const getClientIp = (req: any) =>
  String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();

const checkRateLimit = (ip: string) => {
  const now = Date.now();
  const current = rateLimitStore.get(ip);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (current.count >= 5) return false;
  current.count += 1;
  return true;
};

const publicTrackingMessage = (status: string) => {
  if (status === 'Processing') return 'Your order is being prepared.';
  if (status === 'Shipped') return 'Your order is on the way.';
  if (status === 'Delivered') return 'Your order has been delivered.';
  if (status === 'Cancelled') return 'This order has been cancelled.';
  if (status === 'Refunded') return 'This order has been refunded.';
  return 'Your order has been received.';
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

  if (!checkRateLimit(getClientIp(req))) {
    return res.status(429).json({ error: 'Too many tracking requests. Please wait a minute and try again.' });
  }

  if (!supabaseUrl || !supabaseSecretKey || !supabasePublishableKey) {
    return res.status(500).json({ error: 'Tracking service is not configured.' });
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ error: 'Sign in before tracking your order.' });
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
  if (userError || !user?.id || !user.email) {
    return res.status(401).json({ error: 'Invalid user session.' });
  }

  const trackingNumber = String(req.body?.trackingNumber || '').trim().toUpperCase();
  if (!trackingRegex.test(trackingNumber)) {
    return res.status(400).json({ error: 'A valid tracking number is required.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id,data')
    .eq('data->>trackingNumber', trackingNumber)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: 'Tracking lookup could not be completed.' });
  }

  if (!data?.data) {
    return res.status(404).json({ error: 'No order found with the provided tracking number.' });
  }

  const order = data.data;
  if (order.authUserId !== user.id && order.userEmail !== user.email) {
    return res.status(404).json({ error: 'No order found with the provided tracking number.' });
  }

  return res.status(200).json({
    order: {
      id: order.id || data.id,
      date: order.date,
      status: order.status,
      trackingNumber: order.trackingNumber,
      trackingUpdates: (Array.isArray(order.trackingUpdates) ? order.trackingUpdates : [])
        .map(({ status, date, note }: any) => ({
          status: String(status || ''),
          date: String(date || ''),
          note: publicTrackingMessage(String(status || note || '')),
        })),
    },
  });
}
