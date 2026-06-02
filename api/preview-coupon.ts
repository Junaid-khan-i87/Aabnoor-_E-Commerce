import { randomBytes } from 'crypto';
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

const checkPreviewRateLimit = async (supabaseAdmin: any, authUserId: string): Promise<boolean> => {
  const recentWindow = new Date(Date.now() - 60_000).toISOString();
  const { count, error: countError } = await supabaseAdmin
    .from('coupon_preview_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('auth_user_id', authUserId)
    .gte('created_at', recentWindow);

  if (countError) {
    console.error('Coupon preview rate limit count failed.', countError);
    return true;
  }

  if ((count || 0) >= 10) return false;

  const { error: insertError } = await supabaseAdmin
    .from('coupon_preview_attempts')
    .insert({
      id: `CPR-${randomBytes(8).toString('hex')}`,
      auth_user_id: authUserId,
    });

  if (insertError) {
    console.error('Coupon preview rate limit insert failed.', insertError);
    return true;
  }

  return true;
};

const invalid = (reason: string) => ({ valid: false, reason });

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

  if (!supabaseUrl || !supabaseSecretKey || !supabasePublishableKey) {
    return res.status(500).json({ error: 'Coupon preview service is not configured.' });
  }

  const token = bearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Sign in before applying a coupon.' });
  }

  const userClient = createUserSupabaseClient(token);
  const supabaseAdmin = createAdminSupabaseClient();
  if (!userClient || !supabaseAdmin) {
    return res.status(500).json({ error: 'Coupon preview service is not configured.' });
  }

  const { data: userResult, error: userError } = await userClient.auth.getUser(token);
  const user = userResult?.user;
  if (userError || !user?.id) {
    return res.status(401).json({ error: 'Invalid user session.' });
  }

  if (!(await checkPreviewRateLimit(supabaseAdmin, user.id))) {
    return res.status(429).json({ error: 'Too many coupon attempts. Please wait a minute and try again.' });
  }

  const couponCode = cleanText(req.body?.couponCode, 40).toUpperCase();
  const cartTotal = Number(req.body?.cartTotal);

  if (!couponCode) {
    return res.status(400).json(invalid('Enter a coupon code.'));
  }

  if (!Number.isFinite(cartTotal) || cartTotal < 0) {
    return res.status(400).json(invalid('Cart total is invalid.'));
  }

  let { data: couponRow, error: couponError } = await supabaseAdmin
    .from('coupons')
    .select('id,data')
    .eq('id', couponCode)
    .maybeSingle();

  if (!couponRow) {
    const fallbackResult = await supabaseAdmin
      .from('coupons')
      .select('id,data')
      .eq('data->>code', couponCode)
      .maybeSingle();
    couponRow = fallbackResult.data;
    couponError = couponError || fallbackResult.error;
  }

  if (couponError) {
    return res.status(500).json({ error: 'Coupon could not be checked.' });
  }

  const coupon = couponRow?.data;
  if (!coupon) {
    return res.status(200).json(invalid('Invalid or inactive coupon code.'));
  }

  const now = Date.now();
  const starts = coupon.startDate ? Date.parse(coupon.startDate) : 0;
  const ends = coupon.endDate ? Date.parse(coupon.endDate) : Number.MAX_SAFE_INTEGER;
  if (!coupon.isActive || now < starts || now > ends) {
    return res.status(200).json(invalid('Invalid or inactive coupon code.'));
  }

  if (cartTotal < Number(coupon.minOrderAmount || 0)) {
    return res.status(200).json(invalid(`Minimum order amount is Rs. ${Number(coupon.minOrderAmount || 0).toFixed(2)}`));
  }

  if (coupon.usageLimit != null && (Number(coupon.usageCount) || 0) >= Number(coupon.usageLimit)) {
    return res.status(200).json(invalid('This coupon has reached its usage limit.'));
  }

  const discountPercentage = Math.min(80, Math.max(0, Number(coupon.discountPercentage || 0)));
  if (discountPercentage <= 0) {
    return res.status(200).json(invalid('Invalid or inactive coupon code.'));
  }

  return res.status(200).json({ valid: true, discountPercentage });
}
