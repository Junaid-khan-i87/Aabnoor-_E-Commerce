import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../CartContext';
import { useProducts } from '../ProductContext';
import { useSite } from '../SiteContext';
import { SafeImage } from '../components/SafeImage';
import { SEO } from '../components/SEO';

const paymentBadges = ['COD', 'JazzCash', 'Easypaisa', 'Visa', 'Mastercard'];

export function CartPage() {
  const { items, addToCart, updateQuantity, removeFromCart, cartTotal } = useCart();
  const { productsList } = useProducts();
  const { coupons, settings } = useSite();
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<typeof coupons[number] | null>(null);

  const discountAmount = appliedCoupon ? cartTotal * (appliedCoupon.discountPercentage / 100) : 0;
  const shipping = cartTotal - discountAmount >= settings.freeShippingThreshold ? 0 : settings.deliveryFee;
  const total = Math.max(0, cartTotal - discountAmount + shipping);
  const upsell = productsList.filter(product => !items.some(item => item.id === product.id)).slice(0, 3);

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    const found = coupons.find(coupon => coupon.code.toUpperCase() === code && coupon.isActive);
    if (!found) {
      setCouponError('Invalid or inactive promo code.');
      setAppliedCoupon(null);
      return;
    }
    if (found.minOrderAmount && cartTotal < found.minOrderAmount) {
      setCouponError(`Minimum order is PKR ${Number(found.minOrderAmount).toFixed(0)}.`);
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon(found);
    setCouponError('');
  };

  return (
    <div className="min-h-screen bg-[#faf6f1] pt-28 pb-20">
      <SEO
        title="Cart | Aabnoor Beaute"
        description="Review your Aabnoor Beaute cart, apply promo codes and continue to secure checkout with COD, JazzCash and Easypaisa support."
        canonicalPath="/cart"
      />
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#c8847a] font-bold">Shopping Bag</p>
            <h1 className="mt-2 font-serif text-5xl text-[#2c2420]">Cart</h1>
          </div>
          <p className="font-sans text-xs uppercase tracking-[0.18em] text-[#8a7f7a]">
            {items.length} line item{items.length === 1 ? '' : 's'}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="border border-[#2c2420]/10 bg-white px-6 py-20 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#f5e6e4]">
              <ShoppingBag className="h-8 w-8 text-[#c8847a]" />
            </div>
            <h2 className="font-serif text-3xl text-[#2c2420]">Your bag is empty</h2>
            <p className="mt-3 font-sans text-sm text-[#8a7f7a]">Start with bestsellers or live sale picks.</p>
            <Link to="/#shop" className="mt-8 inline-flex bg-[#2c2420] px-8 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-white">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              {items.map((item) => {
                const unitPrice = item.isFlashSale && item.flashSalePrice ? item.flashSalePrice : item.price;
                return (
                  <div key={item.id} className="grid grid-cols-[86px_1fr] gap-4 border border-[#2c2420]/10 bg-white p-4 sm:grid-cols-[100px_1fr_auto] sm:items-center">
                    <div className="aspect-[4/5] overflow-hidden bg-[#f5e6e4]">
                      <SafeImage src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-[#8a7f7a]">{item.category}</p>
                      <h2 className="mt-1 font-serif text-xl leading-tight text-[#2c2420]">{item.name}</h2>
                      <p className="mt-2 font-sans text-xs text-[#8a7f7a]">PKR {Number(unitPrice).toFixed(2)} each</p>
                      <div className="mt-4 flex w-fit items-center border border-[#2c2420]/15">
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 hover:bg-[#2c2420]/5" aria-label="Decrease quantity">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center font-sans text-sm font-bold">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 hover:bg-[#2c2420]/5" aria-label="Increase quantity">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center justify-between border-t border-[#2c2420]/10 pt-4 sm:col-span-1 sm:block sm:border-t-0 sm:pt-0 sm:text-right">
                      <p className="font-serif text-xl text-[#2c2420]">PKR {(unitPrice * item.quantity).toFixed(2)}</p>
                      <button type="button" onClick={() => removeFromCart(item.id)} className="mt-0 inline-flex items-center gap-1 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-[#8a7f7a] hover:text-red-600 sm:mt-4">
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}

              {upsell.length > 0 && (
                <div className="border border-[#2c2420]/10 bg-[#fffaf7] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-serif text-2xl text-[#2c2420]">You might also like</h2>
                    <Link to="/#shop" className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8847a]">See all</Link>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {upsell.map(product => (
                      <div key={product.id} className="flex gap-3 border border-[#2c2420]/10 bg-white p-2">
                        <SafeImage src={product.imageUrl} alt={product.name} className="h-16 w-12 object-cover" />
                        <div className="min-w-0">
                          <Link to={`/product/${product.id}`} className="font-serif text-sm leading-tight line-clamp-2 hover:text-[#c8847a]">{product.name}</Link>
                          <p className="mt-1 font-sans text-[11px] text-[#8a7f7a]">PKR {Number(product.price).toFixed(0)}</p>
                          <button
                            type="button"
                            onClick={() => addToCart(product)}
                            className="mt-2 font-sans text-[9px] font-bold uppercase tracking-[0.16em] text-[#2c2420] underline underline-offset-4"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="h-fit border border-[#2c2420]/10 bg-white p-6 lg:sticky lg:top-28">
              <h2 className="font-sans text-xs font-bold uppercase tracking-[0.22em] text-[#2c2420]">Order Summary</h2>
              <div className="mt-5 space-y-3 border-b border-[#2c2420]/10 pb-5 font-sans text-sm text-[#8a7f7a]">
                <div className="flex justify-between"><span>Subtotal</span><span>PKR {cartTotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>{discountAmount ? `- PKR ${discountAmount.toFixed(2)}` : 'PKR 0.00'}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? 'Free' : `PKR ${Number(shipping).toFixed(2)}`}</span></div>
              </div>
              <div className="mt-5 flex justify-between font-sans text-sm font-bold uppercase tracking-[0.18em] text-[#2c2420]">
                <span>Total</span>
                <span className="font-serif text-2xl normal-case tracking-normal">PKR {total.toFixed(2)}</span>
              </div>
              <div className="mt-6">
                <label className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7f7a]">Promo Code</label>
                <div className="mt-2 flex">
                  <input value={couponInput} onChange={(event) => setCouponInput(event.target.value)} className="min-w-0 flex-1 border border-[#2c2420]/15 px-3 py-3 font-sans text-sm outline-none focus:border-[#2c2420]" placeholder="BEAUTE10" />
                  <button type="button" onClick={applyCoupon} className="bg-[#2c2420] px-4 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-white">Apply</button>
                </div>
                {couponError && <p className="mt-2 font-sans text-xs text-red-600">{couponError}</p>}
                {appliedCoupon && <p className="mt-2 font-sans text-xs text-green-700">{appliedCoupon.code} applied.</p>}
              </div>
              <button type="button" onClick={() => navigate('/checkout')} className="mt-6 w-full bg-[#c8847a] px-6 py-4 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:bg-[#8b4a44]">
                Proceed to Checkout
              </button>
              <div className="mt-5 flex flex-wrap gap-2">
                {paymentBadges.map(method => (
                  <span key={method} className="rounded-[4px] bg-[#f7f0e6] px-2 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a7f7a]">
                    {method}
                  </span>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
