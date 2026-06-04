import { rejectLargeBody, setSecurityHeaders } from './_security';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'https://aabnoor.shop,https://www.aabnoor.shop')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const bearerToken = (req: any) =>
  String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

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

const createUserSupabaseClient = (token: string) => {
  if (!supabaseUrl || !supabasePublishableKey) return null;

  return createClient(supabaseUrl, supabasePublishableKey, {
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
};

const createAdminSupabaseClient = () => {
  if (!supabaseUrl || !supabaseSecretKey) return null;

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
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

  if (!supabaseUrl || !supabaseSecretKey || !supabasePublishableKey) {
    return res.status(500).json({ error: 'Order history service is not configured.' });
  }

  const token = bearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Sign in before viewing your orders.' });
  }

  const userClient = createUserSupabaseClient(token);
  const supabaseAdmin = createAdminSupabaseClient();
  if (!userClient || !supabaseAdmin) {
    return res.status(500).json({ error: 'Order history service is not configured.' });
  }

  const { data: userResult, error: userError } = await userClient.auth.getUser(token);
  const user = userResult?.user;
  if (userError || !user?.id) {
    return res.status(401).json({ error: 'Invalid user session.' });
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id,data')
    .eq('data->>authUserId', user.id);

  if (error) {
    return res.status(500).json({ error: 'Orders could not be loaded.' });
  }

  const orders = (data || [])
    .map((row: any) => ({ ...row.data, id: row.data?.id || row.id }))
    .sort((a: any, b: any) => Date.parse(b.date || '') - Date.parse(a.date || ''));

  return res.status(200).json({ orders });
}
