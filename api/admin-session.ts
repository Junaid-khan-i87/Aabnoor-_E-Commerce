import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();

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
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!String(req.headers['content-type'] || '').includes('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }

  if (!supabaseUrl || !supabaseSecretKey || !supabasePublishableKey || !adminEmail) {
    return res.status(500).json({ error: 'Admin session service is not configured.' });
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing admin session.' });
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
  if (userError || !user?.id || user.email?.toLowerCase() !== adminEmail) {
    return res.status(403).json({ error: 'Admin access is restricted.' });
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

  const tokenClaims = decodeJwtPayload(token);
  if (tokenClaims?.aal !== 'aal2') {
    return res.status(428).json({ error: 'Authenticator verification is required.', needsMfa: true });
  }

  return res.status(200).json({ ok: true, isAdmin: true });
}
