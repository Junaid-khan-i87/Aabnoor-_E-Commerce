export interface ProductVariant {
  name: string;
  price: number;
}

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Refunded';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
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
  shippingAddress?: string;
  paymentMethod?: string;
  trackingUpdates?: { status: OrderStatus; date: string; note: string }[];
  coinsAdded?: boolean;
  trackingNumber?: string;
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
