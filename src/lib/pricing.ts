import { Product } from '../types';

export function isFlashSaleActive(product: Product): boolean {
  if (!product.isFlashSale || !product.flashSalePrice) return false;
  if (!product.flashSaleEndTime) return true;
  return Date.parse(product.flashSaleEndTime) > Date.now();
}

export function getActivePrice(product: Product): number {
  const basePrice = Number(product.price);
  if (isFlashSaleActive(product)) {
    return Number(product.flashSalePrice);
  }
  return basePrice;
}
