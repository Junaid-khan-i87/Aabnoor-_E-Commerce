import { createClient } from '@supabase/supabase-js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AdminSession = {
  token: string;
  user: {
    id: string;
    email: string;
  };
  role: 'super_admin' | 'admin';
  isSuperAdmin: boolean;
  supabaseAdmin: any;
};

export type AdminSessionFailure = {
  status: number;
  body: {
    error: string;
    needsMfa?: boolean;
  };
};

type AdminSessionResult =
  | { ok: true; session: AdminSession }
  | { ok: false; failure: AdminSessionFailure };

const env = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  superAdminEmail: (process.env.ADMIN_EMAIL || '').toLowerCase().trim(),
};

const bearerToken = (req: any) =>
  String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

export const normalizeEmail = (value: unknown) =>
  String(value ?? '').toLowerCase().trim();

const failure = (status: number, error: string, extra?: Partial<AdminSessionFailure['body']>): AdminSessionResult => ({
  ok: false,
  failure: {
    status,
    body: { error, ...extra },
  },
});

export const requireAdminSession = async (req: any, options: { requireSuperAdmin?: boolean } = {}): Promise<AdminSessionResult> => {
  if (!env.supabaseUrl || !env.supabaseSecretKey || !env.supabasePublishableKey || !env.superAdminEmail) {
    return failure(500, 'Admin service is not configured.');
  }

  const token = bearerToken(req);
  if (!token) {
    return failure(401, 'Missing admin session.');
  }

  const userClient = createClient(env.supabaseUrl, env.supabasePublishableKey, {
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
  const authUser = userResult?.user;
  const email = normalizeEmail(authUser?.email);
  if (userError || !authUser?.id || !email || !emailRegex.test(email)) {
    return failure(401, 'Invalid admin session.');
  }

  const { data: mfaData, error: mfaError } = await userClient.auth.mfa.getAuthenticatorAssuranceLevel(token);
  if (mfaError || mfaData?.currentLevel !== 'aal2') {
    return failure(428, 'Authenticator verification is required.', { needsMfa: true });
  }

  const supabaseAdmin: any = createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const isSuperAdmin = email === env.superAdminEmail;
  const { data: accessRow, error: accessError } = await supabaseAdmin
    .from('admin_allowed_emails')
    .select('email,role,status')
    .eq('email', email)
    .maybeSingle();

  if (accessError) {
    return failure(500, 'Admin access could not be checked.');
  }

  const hasActiveGrant = accessRow && accessRow.status !== 'revoked';
  if (!isSuperAdmin && !hasActiveGrant) {
    return failure(403, 'Admin access is restricted.');
  }

  if (options.requireSuperAdmin && !isSuperAdmin) {
    return failure(403, 'Only the main admin can manage admin access.');
  }

  const role = isSuperAdmin ? 'super_admin' : 'admin';

  const { error: allowError } = await supabaseAdmin
    .from('admin_allowed_emails')
    .upsert({
      email,
      role,
      status: 'active',
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (allowError) {
    return failure(500, 'Admin access could not be synced.');
  }

  const { error: adminUserError } = await supabaseAdmin
    .from('admin_users')
    .upsert({
      user_id: authUser.id,
      email,
      role: 'admin',
    });

  if (adminUserError) {
    return failure(500, 'Admin account could not be registered.');
  }

  return {
    ok: true,
    session: {
      token,
      user: {
        id: authUser.id,
        email,
      },
      role,
      isSuperAdmin,
      supabaseAdmin,
    },
  };
};
