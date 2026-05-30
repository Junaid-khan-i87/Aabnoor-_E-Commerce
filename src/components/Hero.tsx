import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCategory } from '../CategoryContext';
import { useSite } from '../SiteContext';

export function Hero() {
  const { scrollToShopAndFilter } = useCategory();
  const { settings } = useSite();

  return (
    <section className="relative overflow-hidden bg-[#faf6f1] pt-28 sm:pt-32 pb-10">
      <div className="mx-auto grid max-w-7xl grid-cols-1 overflow-hidden border border-[#2c2826]/10 bg-[#fffaf7] shadow-[0_24px_70px_rgba(44,40,38,0.08)] lg:min-h-[590px] lg:grid-cols-[0.92fr_1.08fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="flex flex-col justify-center bg-gradient-to-br from-[#fffaf7] via-[#faf1ea] to-[#f8e7df] px-6 py-14 sm:px-10 lg:px-14"
        >
          <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-[#f0d5d0]/70 px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#8a4f48]">
            <Sparkles className="h-3.5 w-3.5" />
            {settings.heroEyebrow || 'New Arrival - Beauty Edit'}
          </p>
          <h1 className="max-w-xl font-serif text-5xl font-light leading-[0.95] tracking-normal text-[#2c2826] sm:text-6xl lg:text-7xl">
            {settings.heroTitle || 'Glow that speaks louder than words'}
          </h1>
          <p className="mt-6 max-w-md font-sans text-sm leading-7 text-[#7a706a] sm:text-base">
            {settings.heroSubtitle || 'Curated premium skincare, makeup, hair care and fragrance delivered with secure checkout and trackable orders.'}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#shop"
              onClick={(e) => {
                e.preventDefault();
                scrollToShopAndFilter('All');
              }}
              className="inline-flex items-center justify-center gap-2 bg-[#2c2826] px-7 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#8a4f48]"
            >
              Shop Now
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/track"
              className="inline-flex items-center justify-center border border-[#2c2826] px-7 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#2c2826] transition-colors hover:border-[#c9847a] hover:text-[#8a4f48]"
            >
              Track Order
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="relative min-h-[380px] overflow-hidden bg-[#e8d8d0] lg:min-h-full"
        >
          <img
            src={settings.heroImageUrl || 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=1800&auto=format&fit=crop'}
            alt="Aabnoor Beaute premium skincare and cosmetics"
            title="Aabnoor Beaute premium skincare and cosmetics"
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#2c2826]/28 via-transparent to-[#faf6f1]/25" />
          <div className="absolute right-5 top-5 bg-[#fffaf7]/92 px-4 py-3 shadow-lg backdrop-blur">
            <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#7a706a]">Bestseller</p>
            <p className="mt-1 font-serif text-xl text-[#8a4f48]">Fresh edit</p>
          </div>
        </motion.div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 border-x border-b border-[#d9c9a8] bg-[#ede0c8] sm:grid-cols-3">
        {[
          { icon: Truck, title: 'Free Delivery', text: `Orders above Rs. ${Number(settings.freeShippingThreshold).toFixed(0)}` },
          { icon: ShieldCheck, title: 'Secure Checkout', text: 'Protected login and payment flow' },
          { icon: Sparkles, title: 'Authentic Beauty', text: 'Curated skincare and makeup' },
        ].map((item) => (
          <div key={item.title} className="flex items-center gap-3 border-b border-[#d9c9a8] px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
            <item.icon className="h-5 w-5 shrink-0 text-[#b8975a]" />
            <div>
              <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-[#2c2826]">{item.title}</p>
              <p className="mt-1 font-sans text-xs text-[#7a706a]">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
