import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCategory } from '../CategoryContext';
import { useSite } from '../SiteContext';

export function Hero() {
  const { scrollToShopAndFilter } = useCategory();
  const { settings } = useSite();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "150%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[620px] h-[88vh] lg:h-screen w-full bg-[#F9F7F2] overflow-hidden flex items-center justify-center">
      {/* Background Image - Absolute positioned */}
      <motion.div 
        initial={{ scale: 1.05, filter: 'blur(10px)' }}
        animate={{ scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        style={{ y: backgroundY }}
        className="absolute inset-x-0 -top-20 -bottom-20 z-0 origin-top"
      >
        <img
          src={settings.heroImageUrl || 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=75&w=1600&auto=format&fit=crop'}
          alt="Aabnoor Beaute premium skincare and cosmetics texture"
          title="Aabnoor Beaute premium skincare and cosmetics texture"
          className="w-full h-full object-cover opacity-40"
          referrerPolicy="no-referrer"
          fetchPriority="high"
        />
        {/* Robust high-contrast gradient overlay to ensure optimal readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#F9F7F2] via-[#F9F7F2]/60 to-[#F9F7F2]/10" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[#F9F7F2]" />
      </motion.div>

      <motion.div style={{ y: textY, opacity }} className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-20 flex flex-col items-center justify-center text-center">
        <motion.div

          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-6"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-[#1A1A1A]/10 bg-[#F9F7F2]/80 px-4 py-2 font-sans text-[10px] uppercase tracking-[0.26em] text-[#1A1A1A]/60 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#CDA185]" />
            {settings.heroEyebrow || 'The Future of Beauty'}
          </p>
          <h1 className="font-serif italic font-light text-5xl md:text-7xl lg:text-[92px] tracking-normal text-[#1A1A1A] max-w-5xl leading-[0.92]">
            {settings.heroTitle || 'Redefine Your Beauty Routine'}
          </h1>
          <p className="font-sans text-sm lg:text-base text-[#1A1A1A]/70 max-w-lg mx-auto leading-relaxed pt-4">
            {settings.heroSubtitle || 'Curated skincare, makeup, hair care, and fragrance essentials designed for modern beauty.'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a
            href="#shop"
            onClick={(e) => { e.preventDefault(); scrollToShopAndFilter('All'); }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-9 py-4 text-[12px] uppercase tracking-[0.18em] font-bold text-white hover:bg-[#1A1A1A]/90 transition-colors"
          >
            Shop Collection
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            to="/live-sale"
            className="inline-flex items-center justify-center rounded-full border border-[#1A1A1A]/15 bg-[#F9F7F2]/70 px-9 py-4 text-[12px] uppercase tracking-[0.18em] font-bold text-[#1A1A1A] hover:border-[#CDA185] hover:text-[#CDA185] transition-colors"
          >
            Live Sale
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-12 grid w-full max-w-3xl grid-cols-3 border-y border-[#1A1A1A]/10 bg-[#F9F7F2]/55 backdrop-blur-sm"
        >
          {[
            ['Secure', 'Checkout'],
            ['Tracked', 'Orders'],
            ['Curated', 'Routines'],
          ].map(([top, bottom]) => (
            <div key={top} className="px-3 py-4 text-center border-r border-[#1A1A1A]/10 last:border-r-0">
              <p className="font-serif italic text-xl text-[#1A1A1A]">{top}</p>
              <p className="mt-1 font-sans text-[9px] uppercase tracking-[0.18em] text-[#1A1A1A]/45">{bottom}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-widest font-sans text-[#1A1A1A]/50">Scroll</span>
        <div className="w-[1px] h-12 bg-[#1A1A1A]/10 relative overflow-hidden">
          <motion.div 
            animate={{ y: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="absolute inset-0 bg-[#1A1A1A]/30"
          />
        </div>
      </motion.div>
    </section>
  );
}
