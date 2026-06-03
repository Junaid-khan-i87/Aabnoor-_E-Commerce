export interface ProductVariant {
  name: string;
  label?: string;
  price: number;
  original_price?: number;
  stock?: number;
  image_url?: string;
}

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Refunded';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  variant?: string;
  imageUrl?: string;
  discount?: number;
}

export interface Order {
  id: string;
  userEmail: string;
  userName?: string;
  date: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  coinsEarned: number;
  coinsToRedeem?: number;
  coinDiscount?: number;
  coinBalance?: number;
  shippingAddress?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  payment_status?: string;
  invoiceNumber?: string;
  invoice_number?: string;
  courierName?: string;
  courier_name?: string;
  codAmount?: number;
  cod_amount?: number;
  amountPaid?: number;
  amount_paid?: number;
  deliveryFee?: number;
  deliveryCharges?: number;
  delivery_charges?: number;
  discountAmount?: number;
  discount_amount?: number;
  taxAmount?: number;
  tax_amount?: number;
  subtotal?: number;
  grandTotal?: number;
  grand_total?: number;
  customerName?: string;
  customer_name?: string;
  customerPhone?: string;
  customer_phone?: string;
  shipping_address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  postal_code?: string;
  parcelWeight?: string;
  parcel_weight?: string;
  internalNotes?: string;
  internal_notes?: string;
  trackingUpdates?: { status: OrderStatus; date: string; note: string }[];
  coinsAdded?: boolean;
  trackingNumber?: string;
  tracking_number?: string;
}

export interface Review {
  id: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
  tags?: string[];
  photos?: string[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  imageUrl: string;
  images?: string[];
  isNew?: boolean;
  isLimitedEdition?: boolean;
  variants?: ProductVariant[];
  ingredients?: string;
  howToUse?: string;
  advantages?: string[];
  disadvantages?: string[];
  fullDetails?: string;
  warnings?: string;
  subCategory?: string;
  stock?: number;
  rating?: number;
  reviews?: Review[];
  isFlashSale?: boolean;
  flashSalePrice?: number;
  flashSaleEndTime?: string;
  sku?: string;
  brand?: string;
  slug?: string;
  product_form?: string;
  net_weight?: string;
  country_of_origin?: string;
  shelf_life?: string;
  skin_type?: string[];
  concerns?: string[];
  claims?: string[];
  seo_title?: string;
  seo_description?: string;
  tags?: string[];
  status?: 'active' | 'draft' | 'hidden';
  is_featured?: boolean;
  is_new_arrival?: boolean;
  is_best_seller?: boolean;
  sort_order?: number;
  is_cruelty_free?: boolean;
  is_vegan?: boolean;
  is_derma_tested?: boolean;
  shipping_weight?: number;
  is_free_shipping?: boolean;
  estimated_delivery?: string;
  return_policy?: 'no-return' | '7-day-return' | '14-day-return' | '30-day-return';
  warranty_info?: string;
  product_video_url?: string;
  has_variants?: boolean;
  variant_type?: 'shade' | 'size' | 'volume' | 'pack_size' | 'color' | string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercentage: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  usageCount: number;
  minOrderAmount?: number;
  applicableCategories?: string[];
  isActive: boolean;
}

export type Category = string;
