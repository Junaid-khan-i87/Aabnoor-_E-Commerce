import { rejectLargeBody, setSecurityHeaders } from './_security';
import { createClient } from '@supabase/supabase-js';
import { randomBytes, randomInt } from 'crypto';

const env = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
};
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

const cleanMultilineText = (value: unknown, maxLength: number) =>
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, maxLength);

const orderId = () => `ORD-${randomBytes(8).toString('hex').toUpperCase()}`;

const trackingNumber = () => {
  const year = new Date().getFullYear().toString().slice(-2);
  return `PK-${year}-${String(randomInt(0, 10_000_000)).padStart(7, '0')}`;
};

const createUserSupabaseClient = (token: string) => {
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

const createAdminSupabaseClient = () => {
  if (!env.supabaseUrl || !env.supabaseSecretKey) return null;

  return createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const DEFAULT_SETTINGS = {
  deliveryFee: 150,
  freeShippingThreshold: 9999,
  taxEnabled: false,
};

const allowedDeliveryMethods = new Set(['standard', 'express']);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[+\d][+\d\s().-]{6,24}$/;

const getBaseProductId = (cartProductId: string, productIds: string[]) => {
  if (productIds.includes(cartProductId)) return cartProductId;
  return productIds.find(id => cartProductId.startsWith(`${id}-`)) || '';
};

const getServerPrice = (product: any, cartProductId: string) => {
  const variantName = cartProductId.startsWith(`${product.id}-`)
    ? cartProductId.slice(product.id.length + 1)
    : '';
  const variant = Array.isArray(product.variants)
    ? product.variants.find((entry: any) => String(entry?.name || '') === variantName)
    : null;

  const basePrice = Number(variant?.price ?? product.price ?? 0);
  const flashPrice = product.isFlashSale && Number(product.flashSalePrice) > 0
    ? Number(product.flashSalePrice)
    : null;

  return flashPrice && (!product.flashSaleEndTime || Date.parse(product.flashSaleEndTime) > Date.now())
    ? Math.min(basePrice, flashPrice)
    : basePrice;
};

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

  if (!env.supabaseUrl || !env.supabaseSecretKey || !env.supabasePublishableKey) {
    return res.status(500).json({ error: 'Order service is not configured.' });
  }

  const token = bearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Sign in before placing an order.' });
  }

  const userClient = createUserSupabaseClient(token);
  const supabaseAdmin = createAdminSupabaseClient();
  if (!userClient || !supabaseAdmin) {
    return res.status(500).json({ error: 'Order service is not configured.' });
  }

  const { data: userResult, error: userError } = await userClient.auth.getUser(token);
  const user = userResult?.user;
  const userEmail = user?.email?.toLowerCase();
  if (userError || !user?.id || !userEmail || !emailRegex.test(userEmail)) {
    return res.status(401).json({ error: 'Invalid user session.' });
  }

  const rateLimitWindow = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count: recentOrderCount } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('data->>authUserId', user.id)
    .gte('data->>date', rateLimitWindow);

  if ((recentOrderCount || 0) >= 5) {
    return res.status(429).json({ error: 'Too many orders placed recently. Please wait a few minutes before trying again.' });
  }

  const userName = cleanText(req.body?.userName || userEmail.split('@')[0], 120);
  const phone = cleanText(req.body?.phone, 32);
  const home = cleanText(req.body?.home, 160);
  const state = cleanText(req.body?.state, 80);
  const country = cleanText(req.body?.country, 80);
  const paymentMethod = cleanText(req.body?.paymentMethod, 40);
  const deliveryMethod = cleanText(req.body?.deliveryMethod, 20) || 'standard';
  const couponCode = cleanText(req.body?.couponCode, 40).toUpperCase();
  const requestedItems = Array.isArray(req.body?.items) ? req.body.items : [];
  const requestedCoinsToRedeem = req.body?.coinsToRedeem ?? 0;
  const coinsToRedeem = Number(requestedCoinsToRedeem);

  if (!Number.isInteger(coinsToRedeem) || coinsToRedeem < 0) {
    return res.status(400).json({ error: 'Loyalty coins must be a non-negative integer.' });
  }

  if (!userName || !phoneRegex.test(phone) || !home || !state || !country) {
    return res.status(400).json({ error: 'Complete name, phone, and shipping address are required.' });
  }

  const isCodMethod = /cash|cod|delivery/i.test(paymentMethod);
  const isOfflineOrPendingPaymentMethod = isCodMethod || /^credit card$/i.test(paymentMethod);
  if (!isOfflineOrPendingPaymentMethod || !allowedDeliveryMethods.has(deliveryMethod)) {
    return res.status(400).json({ error: 'A valid payment and delivery method are required.' });
  }

  if (requestedItems.length < 1 || requestedItems.length > 50) {
    return res.status(400).json({ error: 'Cart is empty or too large.' });
  }

  const customerId = `USR-${user.id}`;
  let { data: customerRow, error: customerError } = await supabaseAdmin
    .from('customers')
    .select('id,data')
    .eq('data->>email', userEmail)
    .maybeSingle();

  if (!customerRow) {
    const fallbackResult = await supabaseAdmin
      .from('customers')
      .select('id,data')
      .eq('id', customerId)
      .maybeSingle();
    customerRow = fallbackResult.data;
    customerError = customerError || fallbackResult.error;
  }

  if (customerError) {
    return res.status(500).json({ error: 'Customer profile could not be loaded.' });
  }

  const customerData = customerRow?.data || {};
  const customerCoins = Math.max(0, Math.floor(Number(customerData.coins) || 0));

  if (coinsToRedeem > customerCoins) {
    return res.status(400).json({ error: 'Insufficient loyalty coins.' });
  }

  const normalizedItems = requestedItems.map((item: any) => ({
    productId: cleanText(item?.productId, 100),
    quantity: Number(item?.quantity),
  }));

  if (normalizedItems.some(item => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 25)) {
    return res.status(400).json({ error: 'Cart contains invalid product quantities.' });
  }

  const cartLookupIds = normalizedItems.flatMap(item => {
    const ids = [item.productId];
    const firstDash = item.productId.indexOf('-');
    const lastDash = item.productId.lastIndexOf('-');
    if (firstDash > 0) ids.push(item.productId.slice(0, firstDash));
    if (lastDash > 0) ids.push(item.productId.slice(0, lastDash));
    return ids;
  });
  const uniqueBaseIds = [...new Set(cartLookupIds)].slice(0, 100);

  const { data: productRows, error: productError } = await supabaseAdmin
    .from('products')
    .select('id,data')
    .in('id', uniqueBaseIds);

  if (productError) {
    return res.status(500).json({ error: 'Products could not be loaded.' });
  }

  const products = (productRows || []).map((row: any) => ({ ...row.data, id: row.id }));
  const productIds = products.map((product: any) => product.id);

  const orderItems = normalizedItems.map(item => {
    const baseProductId = getBaseProductId(item.productId, productIds);
    const product = products.find((entry: any) => entry.id === baseProductId);
    if (!product) return null;

    const price = getServerPrice(product, item.productId);
    if (!Number.isFinite(price) || price < 0) return null;
    const variantKey = item.productId.startsWith(`${product.id}-`)
      ? item.productId.slice(product.id.length + 1)
      : '';
    const variant = Array.isArray(product.variants)
      ? product.variants.find((entry: any) => String(entry?.name || '') === variantKey || String(entry?.label || '') === variantKey)
      : null;

    return {
      productId: item.productId,
      name: cleanText(item.productId === product.id ? product.name : `${product.name} - ${item.productId.slice(product.id.length + 1)}`, 160),
      sku: cleanText(variant?.sku || product.sku || item.productId, 80),
      variant: cleanText(variant?.label || variant?.name || variantKey, 80),
      imageUrl: cleanText(variant?.image_url || product.imageUrl || '', 500),
      price,
      quantity: item.quantity,
    };
  });

  if (orderItems.some(item => !item)) {
    return res.status(400).json({ error: 'One or more cart products are no longer available.' });
  }

  const subtotal = (orderItems as any[]).reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    return sum + (item.quantity >= 5 ? itemTotal * 0.95 : itemTotal);
  }, 0);

  const { data: settingsRow } = await supabaseAdmin
    .from('store_settings')
    .select('value')
    .eq('key', 'settings')
    .maybeSingle();
  const settings = { ...DEFAULT_SETTINGS, ...(settingsRow?.value || {}) };

  let discountPercentage = 0;
  let claimedCouponCode = '';
  if (couponCode) {
    const { data: couponResult, error: couponRpcError } = await supabaseAdmin
      .rpc('claim_coupon', {
        coupon_code: couponCode,
        required_min_amount: subtotal,
      });

    if (couponRpcError) {
      return res.status(500).json({ error: 'Coupon could not be applied. Please try again.' });
    }

    if (!couponResult?.ok) {
      const couponMessages: Record<string, string> = {
        not_found: 'Invalid or inactive coupon code.',
        inactive: 'Invalid or inactive coupon code.',
        expired: 'This coupon is expired or not active yet.',
        below_minimum: 'This coupon does not meet the minimum order amount.',
        limit_reached: 'This coupon has reached its usage limit.',
        invalid_discount: 'This coupon discount is not valid.',
      };
      return res.status(400).json({ error: couponMessages[String(couponResult?.reason || '')] || 'Coupon could not be applied.' });
    }

    discountPercentage = Math.min(100, Math.max(0, Number(couponResult.discountPercentage || 0)));
    claimedCouponCode = couponCode;
  } else {
    const { count } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('data->>authUserId', user.id);
    const { count: legacyEmailCount } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('data->>userEmail', userEmail);
    if ((count || 0) === 0 && (legacyEmailCount || 0) === 0) {
      discountPercentage = 10;
    }
  }

  const subtotalAfterDiscount = subtotal * (1 - discountPercentage / 100);
  const promotionalDiscount = Math.round((subtotal - subtotalAfterDiscount) * 100) / 100;
  const baseDeliveryFee = subtotal >= Number(settings.freeShippingThreshold || DEFAULT_SETTINGS.freeShippingThreshold)
    ? 0
    : Number(settings.deliveryFee || DEFAULT_SETTINGS.deliveryFee);
  const deliveryFee = deliveryMethod === 'express' ? baseDeliveryFee + 100 : baseDeliveryFee;
  const taxAmount = 0;
  const totalBeforeCoinDiscount = Math.round((subtotalAfterDiscount + deliveryFee + taxAmount) * 100) / 100;
  const coinDiscount = Math.min(totalBeforeCoinDiscount, Math.floor(coinsToRedeem / 10));
  const total = Math.round((totalBeforeCoinDiscount - coinDiscount) * 100) / 100;
  const coinsEarned = Math.floor(total / 10);
  let coinBalance = customerCoins - coinsToRedeem + coinsEarned;
  const nowIso = new Date().toISOString();
  const id = orderId();
  const tracking = trackingNumber();
  const invoice = `INV-${id.replace(/^ORD-/i, '').slice(0, 10).toUpperCase()}`;
  const shippingAddress = cleanMultilineText(`${home}\n${state}, ${country}\nPhone: ${phone}\nEmail: ${userEmail}`, 600);
  const isCod = /cash|cod|delivery/i.test(paymentMethod);
  // TODO: Integrate a real payment gateway (e.g. Stripe) here.
  // Until integration is complete, all non-COD orders are created as
  // 'Pending Payment' and must be manually confirmed by the admin.
  const paymentStatus = isCod ? 'COD Due' : 'Pending Payment';

  const order = {
    id,
    invoiceNumber: invoice,
    invoice_number: invoice,
    authUserId: user.id,
    userEmail,
    userName,
    customerName: userName,
    customer_name: userName,
    customerPhone: phone,
    customer_phone: phone,
    date: nowIso,
    items: orderItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discountPercentage,
    discountAmount: Math.round((promotionalDiscount + coinDiscount) * 100) / 100,
    discount_amount: Math.round((promotionalDiscount + coinDiscount) * 100) / 100,
    coinsToRedeem,
    coinDiscount,
    deliveryFee,
    deliveryCharges: deliveryFee,
    delivery_charges: deliveryFee,
    deliveryMethod,
    taxAmount,
    tax_amount: taxAmount,
    total,
    grandTotal: total,
    grand_total: total,
    status: 'Pending',
    coinsEarned,
    coinBalance,
    shippingAddress,
    shipping_address: shippingAddress,
    city: state,
    province: country,
    postalCode: '',
    postal_code: '',
    paymentMethod,
    paymentStatus,
    payment_status: paymentStatus,
    codAmount: isCod ? total : 0,
    cod_amount: isCod ? total : 0,
    amountPaid: 0,
    amount_paid: 0,
    courierName: '',
    courier_name: '',
    parcelWeight: '',
    parcel_weight: '',
    internalNotes: '',
    internal_notes: '',
    trackingNumber: tracking,
    tracking_number: tracking,
    trackingUpdates: [{
      status: 'Pending',
      date: nowIso,
      note: 'Order placed, awaiting admin approval',
    }],
  };

  const { error: insertError } = await supabaseAdmin
    .from('orders')
    .insert({ id, data: order });

  if (insertError) {
    if (claimedCouponCode) {
      await supabaseAdmin.rpc('release_coupon_claim', { coupon_code: claimedCouponCode });
    }
    return res.status(500).json({ error: 'Order could not be saved.' });
  }

  const nextCustomerProfile = {
    ...customerData,
    id: customerData.id || customerRow?.id || customerId,
    email: userEmail,
    name: customerData.name || userName,
    joined: customerData.joined || new Date().toISOString().slice(0, 10),
    warnings: Number(customerData.warnings) || 0,
    status: customerData.status || 'Active',
  };

  const { coins: _currentCoins, ...customerPatch } = nextCustomerProfile;
  const { data: coinResult, error: coinError } = await supabaseAdmin
    .rpc('redeem_and_credit_coins', {
      p_customer_id: customerRow?.id || customerId,
      p_coins_to_spend: coinsToRedeem,
      p_coins_earned: coinsEarned,
      p_customer_patch: customerPatch,
    });

  if (coinError || !coinResult?.ok) {
    await supabaseAdmin.from('orders').delete().eq('id', id);
    if (claimedCouponCode) {
      await supabaseAdmin.rpc('release_coupon_claim', { coupon_code: claimedCouponCode });
    }
    return res.status(400).json({
      error: coinResult?.reason === 'insufficient_coins'
        ? 'Insufficient loyalty coins.'
        : 'Loyalty coins could not be updated.',
    });
  }

  coinBalance = Number(coinResult.new_balance);
  order.coinBalance = coinBalance;
  await supabaseAdmin
    .from('orders')
    .update({ data: order })
    .eq('id', id);

  return res.status(200).json({ order, coinsEarned, coinBalance });
}
