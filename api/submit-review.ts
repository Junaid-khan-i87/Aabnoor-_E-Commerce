import { rejectLargeBody, setSecurityHeaders } from './_security';
import { createClient } from '@supabase/supabase-js';
import { createHmac, randomBytes } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const reviewHashSecret = process.env.REVIEW_HASH_SECRET || supabaseSecretKey;
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'https://aabnoor.shop,https://www.aabnoor.shop')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

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

const ALLOWED_PHOTO_HOSTS = new Set([
  'images.unsplash.com',
  'res.cloudinary.com',
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
  'i.imgur.com',
  'cdn.shopify.com',
]);

const isAllowedPhotoUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_PHOTO_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
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

  if (!supabaseUrl || !supabasePublishableKey || !supabaseSecretKey || !reviewHashSecret) {
    return res.status(500).json({ error: 'Review service is not configured.' });
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Sign in before posting a review.' });
  }

  const userClient = createClient(supabaseUrl, supabasePublishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: userResult, error: userError } = await userClient.auth.getUser(token);
  const user = userResult?.user;
  if (userError || !user?.email) {
    return res.status(401).json({ error: 'Invalid user session.' });
  }

  const productId = cleanText(req.body?.productId, 80);
  const rating = Number(req.body?.rating);
  const comment = cleanText(req.body?.comment, 1200);
  const displayName = cleanText(req.body?.name, 80) || user.email.split('@')[0];
  const tags = Array.isArray(req.body?.tags)
    ? req.body.tags.map((tag: unknown) => cleanText(tag, 32)).filter(Boolean).slice(0, 8)
    : [];
  const photos = Array.isArray(req.body?.photos)
    ? req.body.photos
        .map((photo: unknown) => cleanText(photo, 500))
        .filter(isAllowedPhotoUrl)
        .slice(0, 3)
    : [];

  if (!productId) {
    return res.status(400).json({ error: 'A valid product is required.' });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  }

  if (comment.length < 8) {
    return res.status(400).json({ error: 'Review comment must be at least 8 characters.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: deliveredOrderRows, error: purchaseError } = await supabaseAdmin
    .from('orders')
    .select('id,data')
    .eq('data->>authUserId', user.id)
    .eq('data->>status', 'Delivered')
    .limit(50);

  const isVerifiedPurchase = !purchaseError && (deliveredOrderRows || []).some((row: any) => {
    const items = Array.isArray(row.data?.items) ? row.data.items : [];
    return items.some((item: any) => {
      const orderedProductId = String(item?.productId || '');
      return orderedProductId === productId || orderedProductId.startsWith(`${productId}-`);
    });
  });

  const { data: productRow, error: productError } = await supabaseAdmin
    .from('products')
    .select('id,data')
    .eq('id', productId)
    .maybeSingle();

  if (productError) {
    return res.status(500).json({ error: 'Product could not be loaded.' });
  }

  if (!productRow?.data) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const product = productRow.data;
  const currentReviews = Array.isArray(product.reviews) ? product.reviews : [];
  const reviewerHash = createHmac('sha256', reviewHashSecret).update(`${productId}:${user.id}`).digest('hex');
  const alreadyReviewed = currentReviews.some((review: any) => review.reviewerHash === reviewerHash || review.userId === user.id || review.userEmail === user.email);

  if (alreadyReviewed) {
    return res.status(409).json({ error: 'You have already reviewed this product.' });
  }

  const newReview = {
    id: `rev-${randomBytes(8).toString('hex')}`,
    user: displayName,
    reviewerHash,
    rating,
    comment,
    date: new Date().toISOString(),
    tags: tags.length > 0 ? tags : (isVerifiedPurchase ? ['Verified Purchase'] : ['Unverified']),
    photos,
    verified: isVerifiedPurchase,
  };

  const nextReviews = [newReview, ...currentReviews].slice(0, 100);
  const averageRating = Math.round((nextReviews.reduce((sum: number, review: any) => sum + Number(review.rating || 0), 0) / nextReviews.length) * 10) / 10;
  const nextProduct = {
    ...product,
    id: product.id || productRow.id,
    reviews: nextReviews,
    rating: averageRating,
  };

  const { error: updateError } = await supabaseAdmin
    .from('products')
    .upsert({ id: productRow.id, data: nextProduct });

  if (updateError) {
    return res.status(500).json({ error: 'Review could not be saved.' });
  }

  const { reviewerHash: _hidden, ...publicReview } = newReview;
  const publicProduct = {
    ...nextProduct,
    reviews: nextReviews.map(({ reviewerHash: _privateHash, userId: _legacyUserId, userEmail: _legacyUserEmail, ...review }: any) => review),
  };

  return res.status(200).json({ product: publicProduct, review: publicReview });
}
