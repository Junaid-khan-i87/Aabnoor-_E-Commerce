import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Coins } from 'lucide-react';
import { useUI } from '../UIContext';
import { useCategory } from '../CategoryContext';
import { useLoyalty } from '../LoyaltyContext';
import { useSite } from '../SiteContext';
import { useNavigate, useLocation } from 'react-router-dom';

export function MobileMenu() {
  const { isMenuOpen, setIsMenuOpen, setIsLoginOpen } = useUI();
  const { scrollToShopAndFilter } = useCategory();
  const { coins } = useLoyalty();
  const { currentUser, categories, siteName } = useSite();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (category: any) => {
    setIsMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        scrollToShopAndFilter(category);
      }, 100);
    } else {
      scrollToShopAndFilter(category);
    }
  };

  return (
    <AnimatePresence>
      {isMenuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#F9F7F2] z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-[#1A1A1A]/10 h-20">
              <div className="flex flex-col items-start leading-none select-none">
                <span className="font-serif italic text-2xl font-normal tracking-[0.08em] text-[#1A1A1A] capitalize leading-none">
                  {siteName}
                </span>
                <span className="font-sans text-[7px] tracking-[0.5em] font-bold text-[#1A1A1A]/40 uppercase mt-1 leading-none mr-[-0.5em]">
                  beauté
                </span>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 -mr-2 hover:bg-[#1A1A1A]/5 rounded-full">
                <X className="w-5 h-5 text-[#1A1A1A]" />
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-8 text-2xl font-serif">
              <div className="flex items-center gap-2 mb-4 bg-[#1A1A1A]/5 px-4 py-2 rounded-full">
                <Coins className="w-5 h-5 text-[#1A1A1A]" />
                <span className="font-sans text-xs font-bold tracking-[0.1em] text-[#1A1A1A]">{coins} Aabnoor Coins</span>
              </div>
              {categories.map(cat => (
                <a 
                  key={cat}
                  href="/#shop" 
                  onClick={(e) => { e.preventDefault(); handleNav(cat); }} 
                  className="hover:text-[#CDA185] transition-colors"
                >
                  {cat}
                </a>
              ))}
              <span className="text-xs uppercase font-sans tracking-widest text-[#1A1A1A]/30">Experience Modules</span>
              <button onClick={() => { setIsMenuOpen(false); navigate('/live-sale'); }} className="hover:text-[#CDA185] transition-colors leading-none text-xl font-bold">Live Sale ⚡</button>
              <div className="w-12 h-px bg-[#1A1A1A]/20 my-4" />
              {currentUser ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/40">Logged in as {currentUser.name}</span>
                  <button 
                    onClick={() => { setIsMenuOpen(false); navigate('/profile'); }}
                    className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#CDA185] hover:text-[#1A1A1A] transition-colors"
                  >
                    My Account & History
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => { setIsMenuOpen(false); setIsLoginOpen(true); }}
                  className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A] hover:text-[#CDA185] transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
