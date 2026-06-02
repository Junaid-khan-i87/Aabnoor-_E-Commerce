import { Product } from '../types';

export interface ShopSubcategory {
  name: string;
  count: number;
}

export interface ShopCategory {
  name: string;
  count: number;
  isSale?: boolean;
  subcategories: ShopSubcategory[];
}

export const SHOP_CATEGORIES: ShopCategory[] = [
  {
    name: 'Skin Care',
    count: 0,
    subcategories: [
      { name: 'Cleansers', count: 0 },
      { name: 'Serums & Essentials', count: 0 },
      { name: 'Moisturizers', count: 0 },
      { name: 'Night Creams', count: 0 },
      { name: 'Sunscreen', count: 0 },
    ],
  },
  {
    name: 'Makeup',
    count: 0,
    subcategories: [
      { name: 'Lip Care & Rouge', count: 0 },
      { name: 'Mascara & Eyes', count: 0 },
      { name: 'Setting Powders', count: 0 },
      { name: 'Foundations', count: 0 },
      { name: 'Blush', count: 0 },
    ],
  },
  {
    name: 'Hair Care',
    count: 0,
    subcategories: [
      { name: 'Treatment Oils', count: 0 },
      { name: 'Shampoo', count: 0 },
      { name: 'Conditioner', count: 0 },
      { name: 'Scalp Care', count: 0 },
    ],
  },
  {
    name: 'Fragrance',
    count: 0,
    subcategories: [
      { name: 'Parfums', count: 0 },
      { name: 'Oud & Bergamot', count: 0 },
      { name: 'Body Mist', count: 0 },
      { name: 'Gift Sets', count: 0 },
    ],
  },
  {
    name: 'Sale',
    count: 0,
    isSale: true,
    subcategories: [
      { name: 'Flash Deals', count: 0 },
      { name: 'New Arrivals', count: 0 },
      { name: 'Limited Editions', count: 0 },
    ],
  },
];

export const SHOP_CONCERNS = [
  { id: 'glow', label: 'Glow', terms: ['glow', 'bright', 'radiance', 'luminous', 'vitamin'] },
  { id: 'hydrate', label: 'Hydrate', terms: ['hydrate', 'hydrating', 'moisture', 'hyaluronic', 'cream', 'serum'] },
  { id: 'calm', label: 'Calm', terms: ['calm', 'soothing', 'sensitive', 'repair', 'barrier', 'botanical'] },
  { id: 'hair', label: 'Hair', terms: ['hair', 'shampoo', 'conditioner', 'scalp', 'frizz', 'oil'] },
] as const;

export function getShopHref(category: string, subcategory?: string) {
  const params = new URLSearchParams();
  if (category === 'Sale') {
    params.set('sale', 'true');
  } else {
    params.set('category', category);
  }
  if (subcategory) {
    params.set('subcategory', subcategory);
  }
  return `/shop?${params.toString()}`;
}

export function withProductCounts(products: Product[]) {
  return SHOP_CATEGORIES.map((category) => {
    const categoryProducts = category.isSale
      ? products.filter((product) => product.isFlashSale)
      : products.filter((product) => product.category === category.name);

    return {
      ...category,
      count: categoryProducts.length,
      subcategories: category.subcategories.map((subcategory) => ({
        ...subcategory,
        count: category.isSale
          ? countSaleSubcategory(products, subcategory.name)
          : products.filter(
              (product) =>
                product.category === category.name &&
                normalize(product.subCategory) === normalize(subcategory.name)
            ).length,
      })),
    };
  }).filter((category) => category.count > 0);
}

function countSaleSubcategory(products: Product[], subcategory: string) {
  const label = normalize(subcategory);
  if (label === normalize('Flash Deals')) {
    return products.filter((product) => product.isFlashSale).length;
  }
  if (label === normalize('New Arrivals')) {
    return products.filter((product) => product.isNew).length;
  }
  if (label === normalize('Limited Editions')) {
    return products.filter((product) => product.isLimitedEdition).length;
  }
  return 0;
}

export function normalize(value?: string) {
  return String(value || '').trim().toLowerCase();
}
