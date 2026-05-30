import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCategory } from '../CategoryContext';
import { useSite } from '../SiteContext';
import { useProducts } from '../ProductContext';
import { getActivePrice } from '../lib/pricing';

export function Hero() {
  const { scrollToShopAndFilter } = useCategory();
  const { settings } = useSite();
  const { productsList } = useProducts();
  const previewProducts = [...productsList]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 3);

  return (
    <section className="relative overflow-hidden bg-[#faf6f1] pt-28 sm:pt-32 pb-10">
      <div className="relative mx-auto max-w-7xl overflow-hidden border border-[#2c2826]/10 bg-gradient-to-br from-[#2c2420] via-[#3d2b27] to-[#5a3932] shadow-[0_24px_70px_rgba(44,40,38,0.16)]">
        <div className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(45deg,#fff_0,#fff_1px,transparent_1px,transparent_22px)]" />
        <div className="relative grid min-h-[430px] grid-cols-1 items-center gap-8 px-6 py-14 sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <p className="mb-4 inline-flex w-fit items-center gap-2 border border-[#c8847a] px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#f0d5d0]">
              <Sparkles className="h-3.5 w-3.5" />
              {settings.heroEyebrow || 'New Collection 2026'}
            </p>
            <h1 className="max-w-xl font-serif text-5xl font-light leading-[0.95] tracking-normal text-white sm:text-6xl lg:text-7xl">
              {settings.heroTitle || 'Reveal Your Radiance'}
            </h1>
            <p className="mt-6 max-w-md font-sans text-sm leading-7 text-white/65 sm:text-base">
              {settings.heroSubtitle || 'Curated premium skincare, makeup, hair care and fragrance delivered with secure checkout and trackable orders.'}
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a
                href="#shop"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToShopAndFilter('All');
                }}
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden bg-white/10 px-8 py-4 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-white hover:text-[#2c2420] glass-panel"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Shop Now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </a>
              <Link
                to="/live-sale"
                className="inline-flex items-center justify-center border border-white/20 px-8 py-4 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:border-white hover:bg-white/5"
              >
                Live Sale
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="hidden min-h-[310px] items-center justify-center lg:flex"
          >
            <div className="relative flex items-end gap-4">
              {previewProducts.map((product, index) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className={`group w-40 glass-panel p-3 text-center shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:bg-white/20 ${index === 1 ? '-translate-y-8 scale-110 z-10' : ''}`}
                >
                  <div className="mx-auto mb-4 aspect-[4/5] overflow-hidden rounded-sm bg-[#c8847a]/20">
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                  </div>
                  <p className="font-sans text-[9px] uppercase tracking-[0.16em] text-white/80">{product.category}</p>
                  <p className="mt-1 line-clamp-2 font-serif text-[17px] leading-tight text-white">{product.name}</p>
                  <p className="mt-2 font-sans text-[11px] font-bold text-[#f0d5d0]">PKR {getActivePrice(product).toFixed(0)}</p>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 border-x border-b border-[#d9c9a8] bg-[#f7f0e6] sm:grid-cols-3">
        {[
          { icon: Truck, title: 'Free Delivery', text: `Orders above PKR ${Number(settings.freeShippingThreshold).toFixed(0)}` },
          { icon: ShieldCheck, title: '100% Authentic', text: 'Verified products and secure checkout' },
          { icon: Sparkles, title: '24/7 Support', text: settings.storePhone || settings.storeEmail },
        ].map((item) => (
          <div key={item.title} className="flex items-center gap-3 border-b border-[#d9c9a8] px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
            <item.icon className="h-5 w-5 shrink-0 text-[#b8965a]" />
            <div>
              <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-[#2c2420]">{item.title}</p>
              <p className="mt-1 font-sans text-xs text-[#8a7f7a]">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
