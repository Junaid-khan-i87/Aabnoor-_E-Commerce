import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../CartContext';
import { useNavigate } from 'react-router-dom';
import { SafeImage } from './SafeImage';

export function Cart() {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeFromCart, cartTotal } = useCart();
  const navigate = useNavigate();

  // Prevent background scrolling when open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isCartOpen]);

  // Handle ESC key to close cart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCartOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsCartOpen]);

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  const handleViewCart = () => {
    setIsCartOpen(false);
    navigate('/cart');
  };

  const hasDiscount = items.some(item => item.quantity >= 5);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black z-40 cursor-pointer"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-[#F9F7F2] shadow-2xl z-50 flex flex-col border-l border-[#1A1A1A]/10"
          >
            <div className="flex items-center justify-between p-6 border-b border-[#1A1A1A]/10">
              <div className="flex items-center gap-2">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                  Your Cart
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-[#1A1A1A]/5 rounded-full transition-colors cursor-pointer"
                aria-label="Close cart"
              >
                <X className="w-5 h-5 text-[#1A1A1A]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 pt-12">
                  <div className="w-16 h-16 bg-[#1A1A1A]/5 rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-[#1A1A1A]/20" />
                  </div>
                  <p className="text-[#1A1A1A]/60 font-sans text-sm">Your cart is empty.</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="text-[10px] border-b border-[#1A1A1A] pb-1 font-bold tracking-[0.2em] uppercase hover:text-[#CDA185] hover:border-[#CDA185] transition-colors cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-24 h-32 bg-[#1A1A1A]/5 overflow-hidden shrink-0 border border-[#1A1A1A]/5 relative">
                        <SafeImage
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-serif text-lg text-[#1A1A1A] pr-4 leading-tight">
                              {item.name}
                            </h3>
                            <span className="font-serif italic font-medium">
                              {item.isFlashSale && item.flashSalePrice ? (
                                <span className="flex flex-col items-end">
                                  <span className="text-[#CDA185] font-bold">Rs. {Number(item.flashSalePrice).toFixed(2)}</span>
                                  <span className="text-[10px] text-[#1A1A1A]/40 line-through font-normal">Rs. {Number(item.price).toFixed(2)}</span>
                                </span>
                              ) : (
                                `Rs. ${Number(item.price).toFixed(2)}`
                              )}
                            </span>
                          </div>
                          <p className="text-[10px] uppercase tracking-widest text-[#1A1A1A]/50 font-sans font-bold mt-1">{item.category}</p>
                        </div>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center border border-[#1A1A1A]/20 w-fit rounded-full bg-white/20">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-2 hover:bg-[#1A1A1A]/5 transition-colors rounded-l-full cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3 text-[#1A1A1A]" />
                            </button>
                            <span className="w-8 text-center text-xs font-sans font-bold block">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-2 hover:bg-[#1A1A1A]/5 transition-colors rounded-r-full cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3 text-[#1A1A1A]" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="p-2 hover:bg-red-500/10 rounded-full transition-colors text-[#1A1A1A]/40 hover:text-red-500 cursor-pointer"
                            aria-label="Remove item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-[#1A1A1A]/10 bg-[#F9F7F2]">
                {hasDiscount && (
                  <div className="bg-[#1A1A1A]/5 px-4 py-3 rounded-md mb-4 flex items-center justify-between">
                     <span className="font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]">Bulk Discount Applied</span>
                     <span className="font-serif italic text-sm text-[#1A1A1A]">-5% off 5+ items</span>
                  </div>
                )}
                
                <div className="flex justify-between mb-4 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                  <span>Subtotal</span>
                  <span className="font-serif italic font-normal text-lg tracking-normal">Rs. {cartTotal.toFixed(2)}</span>
                </div>
                
                <button
                  type="button"
                  onClick={handleViewCart}
                  className="mb-3 w-full border border-[#1A1A1A] text-[#1A1A1A] py-3 rounded-full font-sans text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/5 transition-all cursor-pointer"
                >
                  View Full Cart
                </button>

                <button 
                  type="button"
                  onClick={handleProceedToCheckout}
                  className="w-full bg-[#1A1A1A] text-[#F9F7F2] py-4 rounded-full font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/80 transition-all flex flex-col items-center justify-center gap-1 leading-none cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                </button>
                
                <p className="text-center text-[10px] text-[#1A1A1A]/50 mt-4 font-sans tracking-wide">
                  Shipping, taxes, and discounts calculated at checkout
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
