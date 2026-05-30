import { createClient } from '@supabase/supabase-js';
import { cleanText } from './_security';
import { createHmac } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const reviewHashSecret = process.env.REVIEW_HASH_SECRET || supabaseSecretKey || 'review-hash-fallback';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabasePublishableKey || !supabaseSecretKey) {
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
        .filter((photo: string) => /^https?:\/\//i.test(photo))
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
  const reviewerHash = createHmac('sha256', reviewHashSecret).update(user.id).digest('hex');
  const alreadyReviewed = currentReviews.some((review: any) => review.reviewerHash === reviewerHash || review.userId === user.id || review.userEmail === user.email);

  if (alreadyReviewed) {
    return res.status(409).json({ error: 'You have already reviewed this product.' });
  }

  const newReview = {
    id: `rev-${Date.now()}`,
    user: displayName,
    reviewerHash,
    rating,
    comment,
    date: new Date().toISOString(),
    tags: tags.length > 0 ? tags : ['Verified Purchase'],
    photos,
    verified: true,
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

  const publicReview = { ...newReview };
  return res.status(200).json({ product: nextProduct, review: publicReview });
}
