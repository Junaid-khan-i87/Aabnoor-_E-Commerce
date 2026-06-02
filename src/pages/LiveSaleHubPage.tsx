import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ShoppingBag, Eye, Percent, Gift, Clock, Calendar, ShieldCheck } from 'lucide-react';
import { useProducts } from '../ProductContext';
import { useCart } from '../CartContext';
import { Link } from 'react-router-dom';
import { useSite } from '../SiteContext';
import { SEO } from '../components/SEO';

export function LiveSaleHubPage() {
  const { productsList } = useProducts();
  const { addToCart } = useCart();
  const { settings } = useSite();
  
  // Filter only flash sale items
  const flashSaleProducts = settings.liveSaleActive
    ? productsList.filter(p => p.isFlashSale && p.flashSalePrice)
    : [];

  // Fallbacks if no products are flagged as flash sales in database yet
  const displayProducts = settings.liveSaleActive && flashSaleProducts.length === 0
    ? productsList.slice(0, 3).map(p => ({
        ...p,
        isFlashSale: true,
        flashSalePrice: Math.round(p.price * 0.8),
        flashSaleEndTime: settings.liveSaleEndTime,
      }))
    : flashSaleProducts;

  const getTimeLeft = () => {
    const endAt = Date.parse(settings.liveSaleEndTime || '');
    const diff = Number.isNaN(endAt) ? 0 : Math.max(0, endAt - Date.now());
    const totalSeconds = Math.floor(diff / 1000);

    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      isEnded: totalSeconds <= 0,
    };
  };

  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);

    setTimeLeft(getTimeLeft());
    return () => clearInterval(timer);
  }, [settings.liveSaleEndTime]);

  return (
    <div className="pt-40 pb-16 bg-[#F9F7F2] min-h-screen">
      <SEO
        title="Aabnoor Live Sale | Flash Deals on Beauty Essentials"
        description="Shop Aabnoor live sale offers on skincare, makeup, hair care and fragrance with limited-time discounts, secure checkout and order tracking."
        canonicalPath="/live-sale"
      />
      
      {/* Dynamic Master Banner */}
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="bg-[#1A1A1A] text-[#F9F7F2] p-8 sm:p-12 rounded-2xl relative overflow-hidden shadow-xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-8 z-10">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#CDA185]/10 rounded-full translate-x-20 -translate-y-20 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-red-500/[0.04] rounded-full blur-xl pointer-events-none" />
          
          <div className="space-y-4 max-w-xl">
            <span className="inline-flex items-center gap-1.5 bg-[#CDA185] text-[#F9F7F2] text-[10px] uppercase font-bold tracking-[0.2em] px-3.5 py-1.5 rounded-full shadow-md">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Aabnoor Live Sale
            </span>
            <h1 className="font-serif italic text-4xl sm:text-5xl text-white tracking-tight leading-tight">
              {settings.liveSaleTitle || 'Midnight Bloom Flash Series'}
            </h1>
            <p className="font-sans text-xs sm:text-sm text-[#F9F7F2]/75 uppercase tracking-widest leading-relaxed">
              {settings.liveSaleSubtitle || 'Limited beauty offers with clear pricing, Cash on Delivery, and order tracking.'} <strong className="text-[#CDA185]">{settings.liveSaleDiscountText || 'up to 40% off'}</strong>. Available while stock lasts.
            </p>

            <div className="flex items-center gap-4 text-[10px] text-[#F9F7F2]/60 font-sans tracking-wide uppercase font-semibold">
              <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-[#CDA185]" /> 100% Secure Checkout</span>
              <span className="w-1.5 h-1.5 bg-[#F9F7F2]/35 rounded-full" />
              <span className="flex items-center gap-1"><Gift className="w-4 h-4 text-[#CDA185]" /> Careful order packing</span>
            </div>
          </div>

          {/* Master Countdown Timer Component */}
          <div className="bg-white/[0.04] border border-white/10 p-6 rounded-xl flex flex-col items-center justify-center min-w-[260px] relative backdrop-blur-sm self-start md:self-auto">
            <span className="font-sans text-[10px] uppercase font-bold tracking-widest text-[#CDA185] mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 animate-pulse text-[#CDA185]" /> {timeLeft.isEnded ? 'Sale Timing Updating' : 'Flash Session Ends In'}
            </span>
            
            <div className="flex gap-4 items-center">
              {timeLeft.days > 0 && (
                <>
                  <div className="flex flex-col items-center">
                    <span className="font-serif italic text-4xl text-white font-extrabold w-12 text-center">
                      {timeLeft.days.toString().padStart(2, '0')}
                    </span>
                    <span className="font-sans text-[9px] uppercase font-semibold tracking-widest text-white/50 mt-1">Days</span>
                  </div>
                  <span className="text-white/35 font-serif text-3xl pb-5">:</span>
                </>
              )}
              <div className="flex flex-col items-center">
                <span className="font-serif italic text-4xl text-white font-extrabold w-12 text-center">
                  {timeLeft.hours.toString().padStart(2, '0')}
                </span>
                <span className="font-sans text-[9px] uppercase font-semibold tracking-widest text-white/50 mt-1">Hours</span>
              </div>
              <span className="text-white/35 font-serif text-3xl pb-5">:</span>
              <div className="flex flex-col items-center">
                <span className="font-serif italic text-4xl text-white font-extrabold w-12 text-center">
                  {timeLeft.minutes.toString().padStart(2, '0')}
                </span>
                <span className="font-sans text-[9px] uppercase font-semibold tracking-widest text-white/50 mt-1">Mins</span>
              </div>
              <span className="text-white/35 font-serif text-3xl pb-5">:</span>
              <div className="flex flex-col items-center">
                <span className="font-serif italic text-4xl text-white font-extrabold w-12 text-center text-[#CDA185]">
                  {timeLeft.seconds.toString().padStart(2, '0')}
                </span>
                <span className="font-sans text-[9px] uppercase font-semibold tracking-widest text-white/50 mt-1">Secs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Catalog View Grid */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between border-b border-[#1A1A1A]/10 pb-4 mb-8 gap-4">
          <div>
            <h2 className="font-serif italic text-2xl text-[#1A1A1A]">Curated Promotional Selections</h2>
            <p className="font-sans text-[10px] text-[#1A1A1A]/50 uppercase tracking-widest mt-0.5">Explore the full catalog of active micro-discounts currently in session.</p>
          </div>
          <span className="font-sans text-[10px] text-[#CDA185] bg-[#CDA185]/10 px-3 py-1.5 rounded font-bold uppercase tracking-wider shadow-sm">
             🔥 {displayProducts.length} flash deals active
          </span>
        </div>

        {/* Promo Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayProducts.map((product) => {
            const savings = product.price - (product.flashSalePrice || product.price);
            const discountPercent = Math.round((savings / product.price) * 100);
            
            return (
              <div 
                key={product.id}
                className="bg-white border border-[#1A1A1A]/10 rounded-xl overflow-hidden group hover:border-[#CDA185] hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  
                  {/* Image container & flags */}
                  <div className="aspect-[3/4] overflow-hidden bg-[#1A1A1A]/5 relative border-b border-[#1A1A1A]/5">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      loading="lazy"
                      decoding="async"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                    
                    {/* Discount badge */}
                    <div className="absolute top-3 left-3 bg-red-500 text-white font-sans text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded shadow-sm flex items-center gap-1 z-10 animate-pulse">
                      <Percent className="w-3.5 h-3.5" /> SAVE {discountPercent}% OFF
                    </div>

                    {/* Stock Alert overlay */}
                    {product.stock && product.stock <= 5 && (
                      <div className="absolute bottom-3 left-3 bg-[#1A1A1A]/85 text-[#F9F7F2] font-sans text-[8.5px] font-bold uppercase tracking-widest px-2 py-0.5 rounded shadow-sm z-10">
                        ⚡ ONLY {product.stock} LEFT
                      </div>
                    )}
                  </div>

                  {/* Pricing and textual detail */}
                  <div className="p-6">
                    <span className="text-[9.5px] uppercase font-bold text-[#CDA185] tracking-widest block mb-1">
                      {product.category}
                    </span>
                    <Link to={`/product/${product.id}`} className="block block group-hover:text-[#CDA185] transition-colors">
                      <h3 className="font-serif text-lg text-[#1A1A1A] line-clamp-1">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="font-sans text-[11px] text-[#1A1A1A]/60 leading-relaxed mt-2 line-clamp-2">
                      {product.description}
                    </p>

                    <div className="flex items-baseline gap-2.5 mt-4">
                      <span className="font-serif text-xl italic font-bold text-[#1A1A1A]">
                        Rs. {Number(product.flashSalePrice).toFixed(2)}
                      </span>
                      <span className="font-sans text-xs text-[#1A1A1A]/40 line-through">
                        Rs. {Number(product.price).toFixed(2)}
                      </span>
                      <span className="font-sans text-[10px] text-green-600 font-bold uppercase tracking-wider">
                         (Save Rs. {Number(savings).toFixed(2)})
                      </span>
                    </div>
                  </div>

                </div>

                <div className="p-6 pt-0 border-t border-[#1A1A1A]/10 mt-4 flex gap-2">
                  <Link 
                    to={`/product/${product.id}`}
                    className="flex-1 text-center py-2.5 border border-[#1A1A1A]/20 text-[#1A1A1A] font-sans text-[10px] uppercase tracking-widest font-bold hover:bg-[#1A1A1A]/5 transition-colors rounded cursor-pointer"
                  >
                     Details
                  </Link>
                  <button
                    onClick={() => addToCart(product)}
                    className="flex-1 bg-[#1A1A1A] hover:bg-[#CDA185] text-[#F9F7F2] py-2.5 font-sans text-[10px] uppercase tracking-widest font-bold transition-all rounded shadow-sm cursor-pointer"
                  >
                     Add To Cart
                  </button>
                </div>
              </div>
            );
          })}
          {displayProducts.length === 0 && (
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center py-20 bg-white border border-[#1A1A1A]/10 rounded-xl">
              <h3 className="font-serif italic text-3xl text-[#1A1A1A] mb-2">Live Sale Is Paused</h3>
              <p className="font-sans text-xs uppercase tracking-widest text-[#1A1A1A]/50">Enable the next sale session from Admin Settings.</p>
            </div>
          )}
        </div>

        {/* Dynamic promotional custom sections (Tiered & Bundle Offers) */}
        <div className="mt-16 bg-[#CDA185]/5 border border-[#CDA185]/20 p-8 sm:p-12 rounded-xl shadow-inner text-center max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[#CDA185] tracking-widest mb-3">
             🎁 BUNDLE & ROUTINE OFFERS
          </span>
          <h3 className="font-serif italic text-3xl text-[#1A1A1A] mb-2 leading-tight">
             Buy More, Save More / Complete The Routine
          </h3>
          <p className="font-sans text-xs text-[#1A1A1A]/60 max-w-lg mx-auto uppercase tracking-wider leading-relaxed mb-6">
             Receive automated beauty benefits when shopping combined items! <br />
             <strong className="text-[#1A1A1A]">Free item:</strong> Add any 5 skin-care products to your basket and claim <strong className="text-[#CDA185]">5% OFF</strong> automatically at checkout.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              to="/"
              className="px-6 py-2.5 bg-[#CDA185] hover:bg-[#CDA185]/90 text-white font-sans text-[10px] uppercase tracking-widest font-extrabold transition-all shadow-md rounded cursor-pointer"
            >
               Browse Complete Boutique
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
