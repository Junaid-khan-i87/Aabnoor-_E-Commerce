import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, ShoppingBag } from 'lucide-react';
import { useUI } from '../UIContext';
import { useProducts } from '../ProductContext';
import { useCart } from '../CartContext';
import { useNavigate } from 'react-router-dom';
import { SafeImage } from './SafeImage';

export function SearchOverlay() {
  const { isSearchOpen, setIsSearchOpen, addToast } = useUI();
  const [query, setQuery] = useState('');
  const { addToCart } = useCart();
  const { productsList } = useProducts();
  const navigate = useNavigate();
  const overlayRef = useRef<HTMLDivElement>(null);

  const results = productsList.filter(p => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    
    const matchesName = p.name.toLowerCase().includes(q);
    const matchesCategory = p.category.toLowerCase().includes(q);
    const matchesDesc = p.description.toLowerCase().includes(q) || (p.fullDetails || '').toLowerCase().includes(q);
    const matchesPrice = p.price.toString().includes(q);
    
    return matchesName || matchesCategory || matchesDesc || matchesPrice;
  });

  useEffect(() => {
    if (isSearchOpen) {
      setQuery('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isSearchOpen]);

  // Support ESC key to close Search overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchOpen]);

  // Handle click outside content area
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsSearchOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <div 
          onClick={handleBackdropClick} 
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex flex-col justify-start"
        >
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full bg-[#F9F7F2] border-b border-[#1A1A1A]/10 shadow-2xl flex flex-col"
            style={{ maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-7xl mx-auto w-full px-6 flex items-center gap-4 h-24 border-b border-[#1A1A1A]/10">
              <Search className="w-6 h-6 text-[#1A1A1A]/50 hidden md:block" />
              <input 
                autoFocus
                type="text" 
                placeholder="Search products by brand, price, category..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-xl md:text-2xl font-serif italic outline-none placeholder:text-[#1A1A1A]/30 text-[#1A1A1A]"
                aria-label="Search products"
              />
              <button 
                onClick={() => setIsSearchOpen(false)} 
                className="p-2 hover:bg-[#1A1A1A]/5 rounded-full cursor-pointer transition-colors"
                aria-label="Close search"
              >
                <X className="w-6 h-6 text-[#1A1A1A]" />
              </button>
            </div>
            
            <div className="max-w-7xl mx-auto w-full px-6 py-8 overflow-y-auto w-full">
              {query.trim() && (
                <>
                  {results.length > 0 ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#1A1A1A]/50 mb-6 font-sans">
                        Showing {results.length} result{results.length === 1 ? '' : 's'} for "{query}"
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {results.map(product => (
                          <div 
                            key={product.id} 
                            className="flex gap-4 group cursor-pointer border border-transparent hover:border-[#1A1A1A]/5 p-2 rounded transition-all" 
                            onClick={() => { setIsSearchOpen(false); navigate(`/product/${product.id}`); }}
                          >
                            <div className="w-20 h-24 bg-white overflow-hidden shrink-0 group-hover:shadow-md transition-shadow relative">
                              <SafeImage 
                                src={product.imageUrl} 
                                alt={product.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                              />
                            </div>
                            <div className="flex flex-col justify-center">
                              <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#1A1A1A] group-hover:text-[#CDA185] transition-colors mb-0.5">{product.name}</h4>
                              <p className="font-serif italic text-sm text-[#1A1A1A]/70 mb-2">Rs. {Number(product.price).toFixed(2)}</p>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                                  addToast(`${product.name} added to your bag`, 'success');
                                  setIsSearchOpen(false);
                                }}
                                className="text-[9px] uppercase tracking-widest font-sans font-bold text-[#1A1A1A] border-b border-[#1A1A1A] w-fit hover:text-[#CDA185] hover:border-[#CDA185] transition-all cursor-pointer"
                              >
                                Add to Bag
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center max-w-md mx-auto">
                      <p className="font-serif italic text-lg text-[#1A1A1A] mb-2">No products found</p>
                      <p className="font-sans text-[11px] uppercase tracking-widest text-[#1A1A1A]/50">
                        We couldn't find anything matching "{query}". Try searching for skincare, face wash, serum, hair treatment, or check spelling.
                      </p>
                    </div>
                  )}
                </>
              )}
              
              {!query.trim() && (
                <div className="py-6">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#1A1A1A]/40 mb-3 font-sans">
                    Trending Searches
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Serum', 'Face Wash', 'Hydraglow', 'Acne Care', 'Hair Treatment', 'Perfume'].map(tag => (
                      <button 
                        key={tag}
                        onClick={() => setQuery(tag)}
                        className="text-[10px] font-sans font-bold uppercase tracking-widest px-3 py-1.5 border border-[#1A1A1A]/10 bg-white hover:bg-[#1A1A1A] hover:text-[#F9F7F2] hover:border-[#1A1A1A] transition-all duration-200 text-[#1A1A1A] rounded-full cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
