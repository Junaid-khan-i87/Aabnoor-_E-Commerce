import { rejectLargeBody, setSecurityHeaders } from './_security';
import { normalizeEmail, requireAdminSession } from './_adminAuth';

const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'https://aabnoor.shop,https://www.aabnoor.shop')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const cleanText = (value: unknown, maxLength: number) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const getAdminUsersByEmail = async (supabaseAdmin: any) => {
  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('user_id,email,created_at');

  return new Map<string, any>((data || []).map((row: any) => [normalizeEmail(row.email), row]));
};

const loadAccessList = async (supabaseAdmin: any) => {
  const { data: accessRows, error } = await supabaseAdmin
    .from('admin_allowed_emails')
    .select('email,role,status,invited_by,invited_at,revoked_by,revoked_at,last_login_at,updated_at,note')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error('Admin access list could not be loaded.');
  }

  const usersByEmail = await getAdminUsersByEmail(supabaseAdmin);

  return (accessRows || []).map((row: any) => {
    const email = normalizeEmail(row.email);
    const adminUser = usersByEmail.get(email);
    return {
      email,
      role: row.role || 'admin',
      status: row.status || 'active',
      invitedBy: row.invited_by || '',
      invitedAt: row.invited_at || '',
      revokedBy: row.revoked_by || '',
      revokedAt: row.revoked_at || '',
      lastLoginAt: row.last_login_at || '',
      updatedAt: row.updated_at || '',
      note: row.note || '',
      userId: adminUser?.user_id || '',
      activatedAt: adminUser?.created_at || '',
    };
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

  const adminSession = await requireAdminSession(req, { requireSuperAdmin: true });
  if ('failure' in adminSession) {
    return res.status(adminSession.failure.status).json(adminSession.failure.body);
  }

  const { supabaseAdmin, user } = adminSession.session;
  const action = cleanText(req.body?.action || 'list', 20);

  try {
    if (action === 'list') {
      const admins = await loadAccessList(supabaseAdmin);
      return res.status(200).json({ admins });
    }

    const targetEmail = normalizeEmail(req.body?.email);
    if (!emailRegex.test(targetEmail)) {
      return res.status(400).json({ error: 'Enter a valid admin email address.' });
    }

    if (action === 'grant') {
      const note = cleanText(req.body?.note, 180);
      const nowIso = new Date().toISOString();
      const { error: grantError } = await supabaseAdmin
        .from('admin_allowed_emails')
        .upsert({
          email: targetEmail,
          role: 'admin',
          status: 'active',
          invited_by: user.id,
          invited_at: nowIso,
          revoked_by: null,
          revoked_at: null,
          updated_at: nowIso,
          note,
        });

      if (grantError) {
        return res.status(500).json({ error: 'Admin access could not be granted.' });
      }

      const { data: customerRow } = await supabaseAdmin
        .from('customers')
        .select('id,data')
        .eq('data->>email', targetEmail)
        .maybeSingle();

      const authUserId = String(customerRow?.id || '').startsWith('USR-')
        ? String(customerRow.id).slice(4)
        : '';

      if (authUserId) {
        await supabaseAdmin
          .from('admin_users')
          .upsert({
            user_id: authUserId,
            email: targetEmail,
            role: 'admin',
          });
      }

      const admins = await loadAccessList(supabaseAdmin);
      return res.status(200).json({
        admins,
        message: authUserId
          ? 'Admin access granted. The user can sign in with MFA.'
          : 'Admin access granted as pending. The user must create/sign in to their account, then set up MFA.',
      });
    }

    if (action === 'revoke') {
      if (targetEmail === user.email) {
        return res.status(400).json({ error: 'You cannot remove your own main admin access here.' });
      }

      const nowIso = new Date().toISOString();
      const { error: revokeError } = await supabaseAdmin
        .from('admin_allowed_emails')
        .update({
          status: 'revoked',
          revoked_by: user.id,
          revoked_at: nowIso,
          updated_at: nowIso,
        })
        .eq('email', targetEmail);

      if (revokeError) {
        return res.status(500).json({ error: 'Admin access could not be revoked.' });
      }

      await supabaseAdmin
        .from('admin_users')
        .delete()
        .eq('email', targetEmail);

      const admins = await loadAccessList(supabaseAdmin);
      return res.status(200).json({ admins, message: 'Admin access revoked.' });
    }

    return res.status(400).json({ error: 'Unsupported admin access action.' });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Admin access could not be updated.' });
  }
}
