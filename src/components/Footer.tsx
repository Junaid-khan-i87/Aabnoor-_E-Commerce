import React, { useState } from 'react';
import { useSite } from '../SiteContext';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, MessageCircle } from 'lucide-react';
import { useUI } from '../UIContext';
import { SUPPORT_EMAIL } from '../SiteContext';
import { getShopHref, SHOP_CATEGORIES } from '../data/categories';

export function Footer() {
  const { siteName, settings } = useSite();
  const { addToast } = useUI();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        addToast('Please enter a valid email address.', 'error');
        return;
      }
      setIsSubscribed(true);
      addToast('Thank you for subscribing to Aabnoor updates.', 'success');
    }
  };

  return (
    <footer className="bg-[#2c2826] text-[#faf6f1] pt-16 pb-10 border-t border-[#3a3330]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-14">
          
          <div className="lg:col-span-1">
            <h2 className="font-serif font-light text-3xl mb-5 text-white leading-none tracking-[0.16em] uppercase">
              {siteName}
            </h2>
            <p className="font-sans text-[12px] text-[#9a9088] max-w-xs leading-7 mb-7">
              Premium skincare, makeup, hair care and fragrance with secure checkout, clear delivery tracking and local payment support.
            </p>
            <div className="flex flex-wrap gap-2 mb-7">
              {['JazzCash', 'Easypaisa', 'COD', 'Visa'].map((method) => (
                <span key={method} className="rounded-[4px] bg-[#3a3330] px-2.5 py-1.5 font-sans text-[10px] uppercase tracking-[0.12em] text-[#ede0c8]">
                  {method}
                </span>
              ))}
            </div>
            <div className="flex gap-4">
              {settings.socialInstagram && settings.socialInstagram !== '#' && settings.socialInstagram !== '' && (
                <a href={settings.socialInstagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 rounded-full hover:bg-[#c9847a] transition-colors" aria-label="Instagram">
                  <Instagram className="w-4 h-4 text-[#faf6f1]" />
                </a>
              )}
              {settings.socialFacebook && settings.socialFacebook !== '#' && settings.socialFacebook !== '' && (
                <a href={settings.socialFacebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 rounded-full hover:bg-[#c9847a] transition-colors" aria-label="Facebook">
                  <Facebook className="w-4 h-4 text-[#faf6f1]" />
                </a>
              )}
              {settings.socialTwitter && settings.socialTwitter !== '#' && settings.socialTwitter !== '' && (
                <a href={settings.socialTwitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 rounded-full hover:bg-[#c9847a] transition-colors" aria-label="Twitter">
                  <Twitter className="w-4 h-4 text-[#faf6f1]" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#ede0c8] mb-6 font-medium">Shop</h3>
            <ul className="space-y-4 font-sans text-xs tracking-widest uppercase text-[#9a9088]">
              {SHOP_CATEGORIES.filter((category) => !category.isSale).slice(0, 4).map((category) => (
                <li key={category.name}>
                  <Link to={getShopHref(category.name)} className="hover:text-[#faf6f1] transition-colors">
                    {category.name}
                  </Link>
                </li>
              ))}
              <li><Link to="/live-sale" className="hover:text-[#faf6f1] transition-colors">Live Sale</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#ede0c8] mb-6 font-medium">About</h3>
            <ul className="space-y-4 font-sans text-xs tracking-widest uppercase text-[#9a9088] mb-8">
              <li><Link to="/our-story" className="hover:text-[#faf6f1] transition-colors">Our Story</Link></li>
              <li><Link to="/sustainability" className="hover:text-[#faf6f1] transition-colors">Sustainability</Link></li>
              <li><Link to="/ingredients" className="hover:text-[#faf6f1] transition-colors">Ingredients</Link></li>
              <li><Link to="/journal" className="hover:text-[#faf6f1] transition-colors">Journal</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#ede0c8] mb-6 font-medium">Customer Care</h3>
            <ul className="space-y-4 font-sans text-xs tracking-widest uppercase text-[#9a9088] mb-8">
              <li><Link to="/shipping" className="hover:text-[#faf6f1] transition-colors">Shipping & Returns</Link></li>
              <li><Link to="/contact" className="hover:text-[#faf6f1] transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-[#faf6f1] transition-colors">FAQs</Link></li>
              <li><Link to="/track" className="hover:text-[#faf6f1] transition-colors">Track Order</Link></li>
            </ul>
            <div className="font-sans text-[10px] tracking-widest text-[#9a9088]">
              <p className="mb-1">{settings.storeEmail || SUPPORT_EMAIL}</p>
              <p>{settings.storePhone || '+1 (800) 123-4567'}</p>
            </div>
            <a
              href={`mailto:${settings.storeEmail || SUPPORT_EMAIL}?subject=Aabnoor support request`}
              className="mt-4 inline-flex items-center gap-2 border border-white/15 px-3 py-2 font-sans text-[10px] uppercase tracking-widest font-bold text-[#faf6f1] hover:bg-[#faf6f1] hover:text-[#2c2826] transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Ask Support
            </a>
          </div>

          <div>
            <h3 className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#ede0c8] mb-6 font-medium">Newsletter</h3>
            
            {isSubscribed ? (
              <div className="font-sans text-sm text-[#faf6f1] bg-white/5 p-4 rounded-[4px] border border-white/10">
                <p className="font-medium mb-1">Thanks for subscribing.</p>
                <p className="text-[#9a9088] text-xs font-semibold">You'll be the first to know about our new launches.</p>
              </div>
            ) : (
              <>
                <p className="font-sans text-sm text-[#9a9088] mb-4 leading-6">
                  Get early access to launches, offers and delivery updates.
                </p>
                <form className="flex border border-white/12 bg-white/[0.04] group" onSubmit={handleSubscribe}>
                  <input 
                    type="email" 
                    placeholder="Email address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="min-w-0 bg-transparent flex-1 outline-none font-sans text-sm placeholder:text-[#9a9088] text-[#faf6f1] px-3 py-3"
                  />
                  <button 
                    type="submit"
                    className="bg-[#faf6f1] px-4 font-sans text-[10px] uppercase tracking-[0.2em] font-bold text-[#2c2826] hover:bg-[#ede0c8] transition-colors cursor-pointer"
                  >
                    Join
                  </button>
                </form>
              </>
            )}
          </div>

        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10 gap-4">
          <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#7a706a]">
            &copy; 2026 {siteName}. All rights reserved.
          </p>
          <div className="flex gap-8 font-sans text-[9px] uppercase tracking-[0.2em] text-[#7a706a]">
            <Link to="/privacy" className="hover:text-[#faf6f1] transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-[#faf6f1] transition-colors">Terms</Link>
            <Link to="/shipping" className="hover:text-[#faf6f1] transition-colors">Shipping</Link>
          </div>
          <div className="font-serif normal-case text-xs text-[#b8975a] hidden md:block">
            Designed for beauty shoppers in Pakistan.
          </div>
        </div>
      </div>
    </footer>
  );
}
