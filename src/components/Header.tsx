import React, { useState } from 'react';
import { ShoppingBag, Search, Menu, User, Coins, Heart } from 'lucide-react';
import { useCart } from '../CartContext';
import { useCategory } from '../CategoryContext';
import { useUI } from '../UIContext';
import { useLoyalty } from '../LoyaltyContext';
import { useSite } from '../SiteContext';
import { motion, useScroll, useMotionValueEvent } from 'motion/react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export function Header() {
  const { setIsCartOpen, cartCount } = useCart();
  const { scrollToShopAndFilter, activeCategory } = useCategory();
  const { setIsSearchOpen, setIsMenuOpen, setIsLoginOpen, setIsWishlistOpen } = useUI();
  const { coins } = useLoyalty();
  const { siteName, categories, bannerText, isBannerActive, currentUser, settings } = useSite();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [showBannerLocal, setShowBannerLocal] = useState(() => {
    return localStorage.getItem('aura_banner_closed') !== 'true';
  });
  const [isLoyaltyOpen, setIsLoyaltyOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() || 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
    setIsScrolled(latest > 50);
  });

  const announcementText = isBannerActive && bannerText.trim()
    ? bannerText
    : `Free shipping over Rs. ${Number(settings.freeShippingThreshold).toFixed(0)} - COD, JazzCash and EasyPaisa supported - Track every order`;
  const showBanner = showBannerLocal;

  const handleNav = (category: any) => {
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
    <motion.header
      variants={{
        visible: { y: 0 },
        hidden: { y: "-100%" },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className={`fixed top-0 inset-x-0 z-30 transition-colors duration-300 flex flex-col ${
        isScrolled ? 'bg-[#fffaf7]/92 backdrop-blur-md border-b border-[#2c2826]/10 shadow-sm' : 'bg-[#fffaf7] border-b border-[#2c2826]/10'
      }`}
    >
      {showBanner && (
        <div className="w-full bg-[#2c2826] text-[#faf6f1] py-2 px-6 flex items-center justify-center relative">
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] font-medium text-center text-[#ede0c8]">
            {announcementText}
          </p>
          <button 
            onClick={() => {
              setShowBannerLocal(false);
              localStorage.setItem('aura_banner_closed', 'true');
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Close announcement"
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 h-16 w-full flex items-center justify-between">
        {/* Mobile Menu */}
        <div className="flex-1 lg:hidden">
          <button className="p-2 -ml-2 hover:bg-[#2c2826]/5 rounded-full transition-colors" aria-label="Menu" onClick={() => setIsMenuOpen(true)}>
            <Menu className="w-5 h-5 text-[#2c2826]" />
          </button>
        </div>

        {/* Desktop Nav */}
        <nav className="flex-1 hidden lg:flex items-center gap-6 font-sans text-[10px] font-medium tracking-[0.18em] uppercase text-[#2c2826]">
          {categories.slice(0, 3).map(cat => {
            const isActive = activeCategory === cat;
            return (
              <a 
                key={cat} 
                href="/#shop" 
                onClick={(e) => { e.preventDefault(); handleNav(cat); }} 
                className={`transition-colors border-b ${isActive ? 'border-[#c9847a] text-[#2c2826]' : 'text-[#7a706a] border-transparent hover:border-[#c9847a] hover:text-[#2c2826]'}`}
              >
                {cat}
              </a>
            );
          })}
          <span className="text-[#2c2826]/15">|</span>
          <Link to="/live-sale" className="text-[#c9847a] hover:text-[#8a4f48] transition-colors font-bold">Live Sale</Link>
        </nav>

        {/* Logo */}
        <div className="flex-1 flex justify-center">
          <Link 
            to="/" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
            className="group flex flex-col items-center justify-center outline-none select-none transition-transform duration-200 active:scale-98"
          >
            <span className="font-serif text-[22px] sm:text-2xl font-normal tracking-[0.16em] text-[#2c2826] group-hover:text-[#c9847a] transition-colors duration-300 uppercase leading-none">
              {siteName}
            </span>
            <span className="font-sans text-[7px] tracking-[0.55em] font-bold text-[#c9847a] uppercase mt-1 leading-none mr-[-0.55em] group-hover:text-[#8a4f48] transition-colors duration-300">
              beaute
            </span>
          </Link>
        </div>

        {/* Actions */}
        <div className="flex-1 flex justify-end items-center gap-2 md:gap-6">
          <button 
            type="button"
            onClick={() => setIsLoyaltyOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#ede0c8]/60 hover:bg-[#ede0c8] rounded-full cursor-pointer transition-all duration-200 outline-none"
            title={`You have ${coins} Aabnoor Coins. Click to learn how to redeem!`} 
            aria-label={`${siteName} Coins`}
          >
            <Coins className="w-4 h-4 text-[#b8975a]" />
            <span className="font-sans text-[11px] font-bold tracking-[0.1em] text-[#2c2826]">{coins}</span>
          </button>

          <button
            className="flex p-2 hover:bg-[#2c2826]/5 rounded-full transition-colors cursor-pointer"
            aria-label="Wishlist"
            onClick={() => setIsWishlistOpen(true)}
          >
            <Heart className="w-5 h-5 text-[#2c2826]" />
          </button>

          <button
            className="flex p-2 hover:bg-[#2c2826]/5 rounded-full transition-colors cursor-pointer"
            aria-label="Search"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="w-5 h-5 text-[#2c2826]" />
          </button>
          
          <button
            onClick={() => currentUser ? navigate('/profile') : setIsLoginOpen(true)}
            className="hidden md:flex p-2 hover:bg-[#2c2826]/5 rounded-full transition-colors cursor-pointer"
            aria-label="User Account"
          >
            <User className="w-5 h-5 text-[#2c2826]" />
          </button>

          <button 
            className="flex items-center gap-2 hover:bg-[#2c2826]/5 p-2 rounded-full transition-colors cursor-pointer"
            aria-label="Cart"
            onClick={() => setIsCartOpen(true)}
          >
            <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#2c2826] hidden xl:block">Cart ({cartCount})</span>
            <div className="w-5 h-5 md:w-4 md:h-4 bg-[#2c2826] rounded-full flex items-center justify-center relative">
              <ShoppingBag className="w-3 h-3 md:w-2 md:h-2 text-[#faf6f1]" />
               {/* Mobile Cart Count Badge */}
               {cartCount > 0 && (
                <span className="xl:hidden absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#FF4C4C] text-white text-[8px] flex items-center justify-center rounded-full font-bold">
                  {cartCount}
                </span>
               )}
            </div>
          </button>
        </div>
      </div>

      {/* Loyalty Coins Info Modal */}
      {isLoyaltyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsLoyaltyOpen(false)}>
          <div 
            className="bg-[#F9F7F2] border border-[#1A1A1A]/10 p-8 max-w-md w-full relative outline-none shadow-2xl animate-slide-in-right pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)'
            }}
          >
            <button 
              onClick={() => setIsLoyaltyOpen(false)}
              className="absolute top-4 right-4 text-[#1A1A1A]/60 hover:text-[#1A1A1A] text-sm cursor-pointer p-1"
              aria-label="Close loyalty info modal"
            >
              x
            </button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-[#CDA185]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Coins className="w-6 h-6 text-[#CDA185]" />
              </div>
              <h3 className="font-display text-base font-bold uppercase tracking-wider text-[#1A1A1A]">
                Aabnoor Loyalty Rewards
              </h3>
              <p className="font-serif italic text-sm text-[#1A1A1A]/60 mt-1">
                Your luxury beauty coin balance: {coins} Aabnoor Coins
              </p>
            </div>
            
            <div className="space-y-4 font-sans text-[11px] text-[#1A1A1A]/70 leading-relaxed uppercase tracking-wider">
              <div className="border-b border-[#1A1A1A]/10 pb-3">
                <p className="font-bold text-[#1A1A1A] mb-1">Earn Aabnoor Coins</p>
                <p className="normal-case tracking-normal text-xs text-[#1A1A1A]/60">
                  You automatically earn <strong className="text-[#1A1A1A]">1 Aabnoor Coin for every Rs. 10</strong> spent during checkout. Place orders or leave product reviews to collect more!
                </p>
              </div>
              <div className="border-b border-[#1A1A1A]/10 pb-3">
                <p className="font-bold text-[#1A1A1A] mb-1">How to redeem</p>
                <p className="normal-case tracking-normal text-xs text-[#1A1A1A]/60">
                  On specific product detail pages, you will see a <strong className="text-[#CDA185]">"Redeem with Coins"</strong> button. If you have enough coins, you can checkout a product variant completely free!
                </p>
              </div>
              <div>
                <p className="font-bold text-[#1A1A1A] mb-1">Member tiers</p>
                <p className="normal-case tracking-normal text-xs text-[#1A1A1A]/60">
                  Silver Member: Under 500 Coins<br />
                  Gold Elite Member: 500+ Coins (Unlock exclusive custom luxury products and priority early access!)
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsLoyaltyOpen(false)}
              className="mt-8 w-full bg-[#1A1A1A] text-[#F9F7F2] py-2.5 font-sans text-[10px] uppercase font-bold tracking-widest hover:bg-[#1A1A1A]/80 transition-all cursor-pointer"
            >
              Acknowledged
            </button>
          </div>
        </div>
      )}
    </motion.header>
  );
}
