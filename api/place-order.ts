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

const allowedPaymentMethods = new Set(['Credit Card', 'Cash on Delivery']);
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

const findCouponRow = async (supabaseAdmin: any, couponCode: string) => {
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

  return { couponRow, couponError };
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

  if (!allowedPaymentMethods.has(paymentMethod) || !allowedDeliveryMethods.has(deliveryMethod)) {
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

  const { data: productRows, error: productError } = await supabaseAdmin
    .from('products')
    .select('id,data');

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
  if (couponCode) {
    const { couponRow } = await findCouponRow(supabaseAdmin, couponCode);
    const coupon = couponRow?.data;
    const now = Date.now();
    const starts = coupon?.startDate ? Date.parse(coupon.startDate) : 0;
    const ends = coupon?.endDate ? Date.parse(coupon.endDate) : Number.MAX_SAFE_INTEGER;
    if (
      coupon?.isActive &&
      now >= starts &&
      now <= ends &&
      subtotal >= Number(coupon.minOrderAmount || 0) &&
      (coupon.usageLimit == null || (Number(coupon.usageCount) || 0) < Number(coupon.usageLimit))
    ) {
      discountPercentage = Math.min(100, Math.max(0, Number(coupon.discountPercentage || 0)));
    }
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
  const coinBalance = customerCoins - coinsToRedeem + coinsEarned;
  const nowIso = new Date().toISOString();
  const id = orderId();
  const tracking = trackingNumber();
  const invoice = `INV-${id.replace(/^ORD-/i, '').slice(0, 10).toUpperCase()}`;
  const shippingAddress = cleanMultilineText(`${home}\n${state}, ${country}\nPhone: ${phone}\nEmail: ${userEmail}`, 600);
  const isCod = /cash|cod/i.test(paymentMethod);

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
    paymentStatus: isCod ? 'COD Due' : 'Paid',
    payment_status: isCod ? 'COD Due' : 'Paid',
    codAmount: isCod ? total : 0,
    cod_amount: isCod ? total : 0,
    amountPaid: isCod ? 0 : total,
    amount_paid: isCod ? 0 : total,
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
    return res.status(500).json({ error: 'Order could not be saved.' });
  }

  const nextCustomerData = {
    ...customerData,
    id: customerData.id || customerRow?.id || customerId,
    email: userEmail,
    name: customerData.name || userName,
    coins: coinBalance,
    joined: customerData.joined || new Date().toISOString().slice(0, 10),
    warnings: Number(customerData.warnings) || 0,
    status: customerData.status || 'Active',
  };

  const { error: customerUpdateError } = await supabaseAdmin
    .from('customers')
    .upsert({
      id: customerRow?.id || customerId,
      data: nextCustomerData,
    });

  if (customerUpdateError) {
    return res.status(500).json({ error: 'Loyalty coins could not be updated.' });
  }

  if (couponCode && discountPercentage > 0) {
    const { couponRow } = await findCouponRow(supabaseAdmin, couponCode);

    if (couponRow?.data) {
      await supabaseAdmin
        .from('coupons')
        .update({
          data: {
            ...couponRow.data,
            usageCount: (Number(couponRow.data.usageCount) || 0) + 1,
          },
        })
        .eq('id', couponRow.id);
    }
  }

  return res.status(200).json({ order, coinsEarned, coinBalance });
}
