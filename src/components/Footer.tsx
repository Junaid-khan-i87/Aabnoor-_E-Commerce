import React, { useState } from 'react';
import { useCategory } from '../CategoryContext';
import { useSite } from '../SiteContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Instagram, Facebook, Twitter, MessageCircle } from 'lucide-react';
import { useUI } from '../UIContext';
import { SUPPORT_EMAIL } from '../SiteContext';

export function Footer() {
  const { scrollToShopAndFilter } = useCategory();
  const { siteName, categories, settings } = useSite();
  const { addToast } = useUI();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        addToast('Please enter a valid email address.', 'error');
        return;
      }
      setIsSubscribed(true);
      addToast('Thank you for subscribing to outer luxury!', 'success');
    }
  };

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
    <footer className="bg-[#F9F7F2] text-[#1A1A1A] pt-16 pb-12 border-t border-[#1A1A1A]/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          
          <div className="lg:col-span-1">
            <h2 className="font-serif italic font-light text-4xl mb-6 text-[#1A1A1A] leading-none">
              {siteName}
            </h2>
            <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-[#1A1A1A]/60 max-w-xs leading-relaxed mb-8">
              Elevating everyday beauty protocols with high-performance formulas and avant-garde aesthetic.
            </p>
            <div className="flex gap-4">
              {settings.socialInstagram && settings.socialInstagram !== '#' && settings.socialInstagram !== '' && (
                <a href={settings.socialInstagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#1A1A1A]/5 rounded-full hover:bg-[#1A1A1A]/10 transition-colors" aria-label="Instagram">
                  <Instagram className="w-4 h-4 text-[#1A1A1A]" />
                </a>
              )}
              {settings.socialFacebook && settings.socialFacebook !== '#' && settings.socialFacebook !== '' && (
                <a href={settings.socialFacebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#1A1A1A]/5 rounded-full hover:bg-[#1A1A1A]/10 transition-colors" aria-label="Facebook">
                  <Facebook className="w-4 h-4 text-[#1A1A1A]" />
                </a>
              )}
              {settings.socialTwitter && settings.socialTwitter !== '#' && settings.socialTwitter !== '' && (
                <a href={settings.socialTwitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#1A1A1A]/5 rounded-full hover:bg-[#1A1A1A]/10 transition-colors" aria-label="Twitter">
                  <Twitter className="w-4 h-4 text-[#1A1A1A]" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#1A1A1A]/40 mb-6 font-medium">Shop</h3>
            <ul className="space-y-4 font-sans text-xs tracking-widest uppercase text-[#1A1A1A]/70">
              {categories.slice(0, 4).map(cat => (
                <li key={cat}><a href="/#shop" onClick={(e) => { e.preventDefault(); handleNav(cat); }} className="hover:text-[#1A1A1A] transition-colors">{cat}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#1A1A1A]/40 mb-6 font-medium">About</h3>
            <ul className="space-y-4 font-sans text-xs tracking-widest uppercase text-[#1A1A1A]/70 mb-8">
              <li><Link to="/our-story" className="hover:text-[#1A1A1A] transition-colors">Our Story</Link></li>
              <li><Link to="/sustainability" className="hover:text-[#1A1A1A] transition-colors">Sustainability</Link></li>
              <li><Link to="/ingredients" className="hover:text-[#1A1A1A] transition-colors">Ingredients</Link></li>
              <li><Link to="/journal" className="hover:text-[#1A1A1A] transition-colors">Journal</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#1A1A1A]/40 mb-6 font-medium">Customer Care</h3>
            <ul className="space-y-4 font-sans text-xs tracking-widest uppercase text-[#1A1A1A]/70 mb-8">
              <li><Link to="/shipping" className="hover:text-[#1A1A1A] transition-colors">Shipping & Returns</Link></li>
              <li><Link to="/contact" className="hover:text-[#1A1A1A] transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-[#1A1A1A] transition-colors">FAQs</Link></li>
              <li><Link to="/track" className="hover:text-[#1A1A1A] transition-colors">Track Order</Link></li>
            </ul>
            <div className="font-sans text-[10px] tracking-widest text-[#1A1A1A]/70">
              <p className="mb-1">{settings.storeEmail || SUPPORT_EMAIL}</p>
              <p>{settings.storePhone || '+1 (800) 123-4567'}</p>
            </div>
            <a
              href={`mailto:${settings.storeEmail || SUPPORT_EMAIL}?subject=Aabnoor support request`}
              className="mt-4 inline-flex items-center gap-2 border border-[#1A1A1A]/15 px-3 py-2 font-sans text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F9F7F2] transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Ask Support
            </a>
          </div>

          <div>
            <h3 className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#1A1A1A]/40 mb-6 font-medium">Newsletter</h3>
            
            {isSubscribed ? (
              <div className="font-sans text-sm text-[#1A1A1A] bg-[#1A1A1A]/5 p-4 rounded-sm border border-[#1A1A1A]/10">
                <p className="font-medium mb-1">Thanks for subscribing.</p>
                <p className="text-[#1A1A1A]/60 text-xs font-semibold">You'll be the first to know about our new launches.</p>
              </div>
            ) : (
              <>
                <p className="font-sans text-sm text-[#1A1A1A]/60 mb-4">
                  Join our mailing list for early access to new launches and exclusive content.
                </p>
                <form className="flex border-b border-[#1A1A1A]/20 pb-2 group" onSubmit={handleSubscribe}>
                  <input 
                    type="email" 
                    placeholder="Email address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-transparent flex-1 outline-none font-sans text-sm placeholder:text-[#1A1A1A]/30 text-[#1A1A1A]"
                  />
                  <button 
                    type="submit"
                    className="font-sans text-[10px] uppercase tracking-[0.2em] font-medium text-[#1A1A1A] hover:text-[#CDA185] transition-colors cursor-pointer"
                  >
                    Join
                  </button>
                </form>
              </>
            )}
          </div>

        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-[#1A1A1A]/10 gap-4">
          <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#1A1A1A]/60">
            &copy; 2026 {siteName}. All rights reserved.
          </p>
          <div className="flex gap-8 font-sans text-[9px] uppercase tracking-[0.2em] text-[#1A1A1A]/60">
            <Link to="/privacy" className="hover:text-[#1A1A1A] transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-[#1A1A1A] transition-colors">Terms</Link>
            <Link to="/shipping" className="hover:text-[#1A1A1A] transition-colors">Shipping</Link>
          </div>
          <div className="italic font-serif normal-case text-xs text-[#1A1A1A]/60 hidden md:block">
            Designed for the discerning.
          </div>
        </div>
      </div>
    </footer>
  );
}
