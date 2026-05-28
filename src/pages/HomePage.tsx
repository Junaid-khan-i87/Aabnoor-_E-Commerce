import React, { useState } from 'react';
import { Hero } from '../components/Hero';
import { Marquee } from '../components/Marquee';
import { ProductGrid } from '../components/ProductGrid';
import { SocialGallery } from '../components/SocialGallery';
import { useProducts } from '../ProductContext';
import { useSite } from '../SiteContext';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Droplets, PackageCheck, Search, ShieldCheck, Sparkles, Star, Truck, WandSparkles } from 'lucide-react';
import { SEO, SEO_SITE_URL } from '../components/SEO';

export function HomePage() {
  const { productsList } = useProducts();
  const { settings } = useSite();
  const [smartQuery, setSmartQuery] = useState('');
  const [routineConcern, setRoutineConcern] = useState('glow');
  const bestSellers = [...productsList]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 3);
  const liveSaleProducts = productsList.filter(product => product.isFlashSale && product.flashSalePrice);
  const routineOptions = [
    { id: 'glow', label: 'Glow', terms: ['glow', 'bright', 'vitamin', 'radiance', 'makeup'] },
    { id: 'hydrate', label: 'Hydrate', terms: ['hydrate', 'hyaluronic', 'moisture', 'serum', 'cream'] },
    { id: 'calm', label: 'Calm', terms: ['calm', 'sensitive', 'soothing', 'botanical', 'repair'] },
    { id: 'hair', label: 'Hair Care', terms: ['hair', 'shampoo', 'conditioner', 'scalp'] },
  ];
  const selectedRoutine = routineOptions.find(option => option.id === routineConcern) || routineOptions[0];
  const routineMatches = productsList
    .filter((product) => {
      const haystack = [product.name, product.category, product.subCategory, product.description, product.fullDetails].join(' ').toLowerCase();
      return selectedRoutine.terms.some(term => haystack.includes(term));
    })
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 3);
  const routineProducts = routineMatches.length > 0 ? routineMatches : bestSellers;
  const smartResults = productsList
    .filter((product) => {
      const query = smartQuery.trim().toLowerCase();
      if (!query) return false;
      return [
        product.name,
        product.category,
        product.subCategory,
        product.description,
        product.price.toString(),
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
    })
    .slice(0, 5);

  return (
    <>
      <SEO
        title="Aabnoor Beaute | Premium Beauty & Skincare"
        description="Shop Aabnoor Beaute for premium skincare, makeup, hair care, fragrance, live sale offers, secure checkout and order tracking."
        canonicalPath="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: 'Aabnoor Beaute',
          url: SEO_SITE_URL,
          image: `${SEO_SITE_URL}/favicon-512.png`,
          description: 'Premium beauty essentials, skincare, makeup, hair care and fragrance.',
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Aabnoor Beauty Product Catalog',
            itemListElement: Array.from(new Set(productsList.map((product) => product.category))).map((category) => ({
              '@type': 'OfferCatalog',
              name: category,
              url: `${SEO_SITE_URL}/#shop`,
            })),
          },
        }}
      />
      <Hero />
      <Marquee />
      <section className="bg-[#F9F7F2] pt-10 pb-8">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-5 items-stretch">
          <div className="bg-white border border-[#1A1A1A]/10 shadow-sm p-4 sm:p-5">
            <label className="font-sans text-[10px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A]/55 mb-3 block">
              Smart Product Search
            </label>
            <div className="flex items-center gap-3 border border-[#1A1A1A]/15 px-4 py-3 bg-[#F9F7F2]">
              <Search className="w-5 h-5 text-[#CDA185] shrink-0" />
              <input
                value={smartQuery}
                onChange={(event) => setSmartQuery(event.target.value)}
                placeholder="Search by product, category, concern, or price..."
                className="w-full bg-transparent outline-none font-sans text-sm text-[#1A1A1A] placeholder:text-[#1A1A1A]/35"
              />
            </div>
            {smartQuery.trim() && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {smartResults.length > 0 ? smartResults.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="flex items-center gap-3 border border-[#1A1A1A]/8 p-2 hover:border-[#CDA185] transition-colors"
                  >
                    <img src={product.imageUrl} alt={product.name} title={product.name} className="w-12 h-14 object-cover bg-[#1A1A1A]/5" referrerPolicy="no-referrer" loading="lazy" />
                    <div className="min-w-0">
                      <p className="font-sans text-[9px] uppercase tracking-widest text-[#CDA185] font-bold">{product.category}</p>
                      <h3 className="font-serif text-sm text-[#1A1A1A] line-clamp-1">{product.name}</h3>
                      <p className="font-sans text-xs text-[#1A1A1A]/65">Rs. {Number(product.isFlashSale && product.flashSalePrice ? product.flashSalePrice : product.price).toFixed(2)}</p>
                    </div>
                  </Link>
                )) : (
                  <p className="sm:col-span-2 font-sans text-xs uppercase tracking-widest text-[#1A1A1A]/45 py-4 text-center">
                    No product matched. Try Skin Care, Makeup, Serum, or a price.
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="border border-[#1A1A1A]/10 bg-[#1A1A1A] p-5 text-[#F9F7F2] shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.22em] font-bold text-[#CDA185] mb-2">New Feature</p>
                <h2 className="font-serif italic text-3xl leading-tight">Find your beauty routine</h2>
              </div>
              <WandSparkles className="h-7 w-7 text-[#CDA185] shrink-0" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {routineOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setRoutineConcern(option.id)}
                  className={`rounded-full border px-4 py-2 font-sans text-[10px] uppercase tracking-[0.16em] font-bold transition-colors ${
                    routineConcern === option.id
                      ? 'border-[#CDA185] bg-[#CDA185] text-[#1A1A1A]'
                      : 'border-white/15 text-white/70 hover:border-white/45 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {routineProducts.map((product) => (
                <Link key={product.id} to={`/product/${product.id}`} className="group border border-white/10 bg-white/[0.06] p-3 hover:border-[#CDA185] transition-colors">
                  <div className="aspect-square overflow-hidden bg-white/10">
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" loading="lazy" />
                  </div>
                  <p className="mt-3 font-sans text-[9px] uppercase tracking-widest text-[#CDA185] font-bold">{product.category}</p>
                  <h3 className="mt-1 font-serif text-base leading-snug line-clamp-2">{product.name}</h3>
                  <p className="mt-2 font-sans text-[11px] text-white/60">Rs. {Number(product.isFlashSale && product.flashSalePrice ? product.flashSalePrice : product.price).toFixed(2)}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="bg-[#F9F7F2] border-y border-[#1A1A1A]/10">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { icon: ShieldCheck, title: 'Secure Checkout', text: 'Protected login and verified order flow.' },
            { icon: Truck, title: 'Fast Delivery', text: `Free shipping over Rs. ${Number(settings.freeShippingThreshold).toFixed(0)}.` },
            { icon: PackageCheck, title: 'Order Tracking', text: 'Tracking number is saved and emailed.' },
            { icon: Sparkles, title: 'Fresh Offers', text: `${liveSaleProducts.length} active flash deal${liveSaleProducts.length === 1 ? '' : 's'}.` },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 bg-white/70 border border-[#1A1A1A]/8 p-4">
              <item.icon className="w-5 h-5 text-[#CDA185] mt-0.5 shrink-0" />
              <div>
                <h3 className="font-sans text-[10px] uppercase tracking-[0.18em] font-bold text-[#1A1A1A]">{item.title}</h3>
                <p className="font-sans text-xs text-[#1A1A1A]/55 mt-1 leading-relaxed">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {bestSellers.length > 0 && (
        <section className="bg-[#F9F7F2] py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#CDA185] font-bold mb-2">Backend Product Highlights</p>
                <h2 className="font-serif italic text-4xl text-[#1A1A1A]">Most Loved Right Now</h2>
              </div>
              {settings.liveSaleActive && (
                <Link to="/live-sale" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-bold text-[#1A1A1A] border border-[#1A1A1A]/15 px-4 py-2 hover:bg-[#1A1A1A] hover:text-[#F9F7F2] transition-colors">
                  <Clock className="w-3.5 h-3.5" />
                  Live Sale
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {bestSellers.map((product) => (
                <Link key={product.id} to={`/product/${product.id}`} className="group bg-white border border-[#1A1A1A]/10 overflow-hidden hover:border-[#CDA185] transition-colors">
                  <div className="aspect-[4/3] overflow-hidden bg-[#1A1A1A]/5">
                    <img src={product.imageUrl} alt={product.name} title={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" loading="lazy" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-sans text-[9px] uppercase tracking-widest font-bold text-[#CDA185]">{product.category}</span>
                      <span className="flex items-center gap-1 font-sans text-[10px] font-bold text-[#1A1A1A]/70">
                        <Star className="w-3 h-3 fill-[#CDA185] stroke-[#CDA185]" />
                        {(product.rating || 0).toFixed(1)}
                      </span>
                    </div>
                    <h3 className="font-serif text-xl text-[#1A1A1A] group-hover:text-[#CDA185] transition-colors line-clamp-1">{product.name}</h3>
                    <p className="font-sans text-xs text-[#1A1A1A]/55 line-clamp-2 mt-2">{product.description}</p>
                    <p className="font-serif italic text-lg text-[#1A1A1A] mt-4">Rs. {Number(product.isFlashSale && product.flashSalePrice ? product.flashSalePrice : product.price).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="bg-white py-20 border-y border-[#1A1A1A]/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 items-start">
          <div>
            <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#CDA185] font-bold mb-3">Why shoppers stay</p>
            <h2 className="font-serif italic text-4xl text-[#1A1A1A] leading-tight">A calmer beauty store with the details people need before checkout.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Droplets, title: 'Routine Matching', text: 'Shop by glow, hydration, calm support or hair care goals.' },
              { icon: PackageCheck, title: 'Backend Tracking', text: 'Orders save tracking numbers and live status history.' },
              { icon: ShieldCheck, title: 'Verified Reviews', text: 'Signed-in customers can leave product feedback.' },
            ].map((item) => (
              <div key={item.title} className="border border-[#1A1A1A]/10 p-5 bg-[#F9F7F2]">
                <item.icon className="h-5 w-5 text-[#CDA185] mb-4" />
                <h3 className="font-sans text-[10px] uppercase tracking-[0.18em] font-bold text-[#1A1A1A]">{item.title}</h3>
                <p className="mt-3 font-sans text-xs leading-relaxed text-[#1A1A1A]/60">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-[#F9F7F2] border-y border-[#1A1A1A]/10 py-14">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-[0.85fr_1.15fr] gap-8 md:gap-12 items-start">
          <div>
            <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#CDA185] font-bold mb-3">Beauty Store in Pakistan</p>
            <h2 className="font-serif italic text-3xl md:text-4xl text-[#1A1A1A] leading-tight">Premium skincare, makeup and hair care with clear delivery tracking.</h2>
          </div>
          <div className="space-y-4 font-sans text-sm leading-7 text-[#1A1A1A]/68">
            <p>
              Aabnoor Beaute curates daily beauty essentials for customers who want simple product discovery, clear pricing and a secure checkout experience. Browse skincare for hydration and barrier care, makeup for polished everyday looks, hair care for cleansing and repair, and fragrance picks for gifting or personal routines.
            </p>
            <p>
              Every product page is built with readable descriptions, product images, pricing, availability, customer reviews and order support details. Checkout includes shipping information before purchase, and each order receives a tracking number by email so customers can follow delivery from the store to their address.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/shipping" className="text-[10px] uppercase tracking-[0.18em] font-bold border-b border-[#1A1A1A]/40 pb-1 hover:text-[#CDA185]">Shipping Details</Link>
              <Link to="/faq" className="text-[10px] uppercase tracking-[0.18em] font-bold border-b border-[#1A1A1A]/40 pb-1 hover:text-[#CDA185]">Beauty FAQs</Link>
              <Link to="/track" className="text-[10px] uppercase tracking-[0.18em] font-bold border-b border-[#1A1A1A]/40 pb-1 hover:text-[#CDA185]">Track Order</Link>
              <a href="#shop" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] font-bold border-b border-[#1A1A1A]/40 pb-1 hover:text-[#CDA185]">
                Shop Now <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </section>
      <ProductGrid />
      <SocialGallery />
    </>
  );
}
