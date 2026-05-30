import { randomBytes, randomInt } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'junaidmushtaq988@gmail.com';

export const env = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
};

export const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const cleanText = (value: unknown, maxLength: number) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

export const cleanMultilineText = (value: unknown, maxLength: number) =>
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, maxLength);

export const bearerToken = (req: any) =>
  String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

export const safeProviderError = (fallback = 'The request could not be completed.') => fallback;

export const orderId = () => `ORD-${randomBytes(4).toString('hex').toUpperCase()}`;

export const trackingNumber = () => {
  const year = new Date().getFullYear().toString().slice(-2);
  return `PK-${year}-${String(randomInt(0, 10_000_000)).padStart(7, '0')}`;
};

export const decodeJwtPayload = (token: string) => {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    return JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

export const createUserSupabaseClient = (token: string) => {
  if (!env.supabaseUrl || !env.supabasePublishableKey) return null;

  return createClient(env.supabaseUrl, env.supabasePublishableKey, {
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

export const createAdminSupabaseClient = () => {
  if (!env.supabaseUrl || !env.supabaseSecretKey) return null;

  return createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const requireAdminUser = async (token: string) => {
  const userClient = createUserSupabaseClient(token);
  const supabaseAdmin = createAdminSupabaseClient();
  if (!userClient || !supabaseAdmin) {
    return { error: 'Admin service is not configured.' as const };
  }

  const { data: userResult, error: userError } = await userClient.auth.getUser(token);
  const user = userResult?.user;
  if (userError || !user?.id || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return { error: 'Only the configured admin can perform this action.' as const };
  }

  const tokenClaims = decodeJwtPayload(token);
  if (tokenClaims?.aal !== 'aal2') {
    return { error: 'Authenticator verification is required before performing this action.' as const };
  }

  const { data: adminRow, error: adminError } = await supabaseAdmin
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    return { error: 'Admin account is not registered.' as const };
  }

  return { user, supabaseAdmin };
};
