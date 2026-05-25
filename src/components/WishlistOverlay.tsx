import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, ShoppingBag } from 'lucide-react';
import { useUI } from '../UIContext';
import { useWishlist } from '../WishlistContext';
import { useCart } from '../CartContext';
import { Link } from 'react-router-dom';

export function WishlistOverlay() {
  const { isWishlistOpen, setIsWishlistOpen } = useUI();
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  return (
    <AnimatePresence>
      {isWishlistOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsWishlistOpen(false)}
            className="fixed inset-0 bg-black z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-[#F9F7F2] z-50 shadow-2xl flex flex-col border-l border-[#1A1A1A]/10"
          >
            <div className="flex items-center justify-between p-6 border-b border-[#1A1A1A]/10">
              <h2 className="font-serif italic text-2xl text-[#1A1A1A]">Your Wishlist</h2>
              <button 
                onClick={() => setIsWishlistOpen(false)}
                className="p-2 hover:bg-[#1A1A1A]/5 rounded-sm transition-colors text-[#1A1A1A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {wishlist.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-[#1A1A1A]/60">
                  <Heart className="w-12 h-12 opacity-20" />
                  <p className="font-sans text-sm">Your wishlist is empty</p>
                  <button 
                    onClick={() => setIsWishlistOpen(false)}
                    className="mt-4 px-6 py-2 bg-[#1A1A1A] text-[#F9F7F2] font-sans text-[10px] uppercase font-bold tracking-widest hover:bg-[#1A1A1A]/90 transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {wishlist.map((item) => (
                    <motion.div 
                      key={item.id} 
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex gap-4 group"
                    >
                      <Link 
                        to={`/product/${item.id}`}
                        onClick={() => setIsWishlistOpen(false)}
                        className="w-24 h-32 bg-[#1A1A1A]/5 relative overflow-hidden flex-shrink-0"
                      >
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </Link>
                      <div className="flex-1 py-1 flex flex-col">
                        <Link 
                          to={`/product/${item.id}`}
                          onClick={() => setIsWishlistOpen(false)}
                        >
                          <h3 className="font-sans font-bold text-sm text-[#1A1A1A] group-hover:text-[#1A1A1A]/70 transition-colors">{item.name}</h3>
                          <p className="font-sans text-[11px] text-[#1A1A1A]/60 mt-1 uppercase tracking-widest">{item.category}</p>
                        </Link>
                        <div className="mt-auto flex items-center justify-between">
                          <span className="font-serif italic text-lg text-[#1A1A1A]">
                            Rs. {item.isFlashSale && item.flashSalePrice ? item.flashSalePrice.toFixed(2) : item.price.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <button 
                            onClick={() => {
                              addToCart(item);
                              removeFromWishlist(item.id);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-[#1A1A1A] text-[#F9F7F2] hover:bg-[#1A1A1A]/90 transition-colors rounded-none font-sans text-[10px] font-bold uppercase tracking-widest"
                          >
                            <ShoppingBag className="w-3 h-3" />
                            Add Cart
                          </button>
                          <button 
                            onClick={() => removeFromWishlist(item.id)}
                            className="p-1.5 text-[#1A1A1A]/40 hover:text-red-500 hover:bg-red-50 transition-colors border border-[#1A1A1A]/10"
                            aria-label="Remove item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
