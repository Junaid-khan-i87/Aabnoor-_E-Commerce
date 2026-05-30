import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const trackingRegex = /^[A-Z]{2}-\d{2}-\d{7}$/i;

const setCorsHeaders = (res: any) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://aabnoor.shop');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
};

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!String(req.headers['content-type'] || '').includes('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }

  if (!supabaseUrl || !supabaseSecretKey) {
    return res.status(500).json({ error: 'Tracking service is not configured.' });
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
          note: String(note || '').slice(0, 180),
        })),
    },
  });
}
