import React, { useState } from 'react';
import { Hero } from '../components/Hero';
import { Marquee } from '../components/Marquee';
import { ProductGrid } from '../components/ProductGrid';
import { TrustBadges } from '../components/TrustBadges';
import { useProducts } from '../ProductContext';
import { useSite } from '../SiteContext';
import { useCategory } from '../CategoryContext';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Droplets, Heart, PackageCheck, Quote, Search, ShieldCheck, Star, WandSparkles } from 'lucide-react';
import { SEO, SEO_SITE_URL } from '../components/SEO';
import { getActivePrice, isFlashSaleActive } from '../lib/pricing';
import { getShortProductName } from '../lib/productText';

export function HomePage() {
  const { productsList } = useProducts();
  const { settings } = useSite();
  const { scrollToShopAndFilter } = useCategory();
  const [smartQuery, setSmartQuery] = useState('');
  const [routineConcern, setRoutineConcern] = useState('glow');
  const visibleProducts = productsList.filter(product => (product.status || 'active') === 'active');
  const bestSellers = [...visibleProducts]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 3);
  const liveSaleProducts = visibleProducts.filter(product => isFlashSaleActive(product));
  const routineOptions = [
    { id: 'glow', label: 'Glow', terms: ['glow', 'bright', 'vitamin', 'radiance', 'makeup'] },
    { id: 'hydrate', label: 'Hydrate', terms: ['hydrate', 'hyaluronic', 'moisture', 'serum', 'cream'] },
    { id: 'calm', label: 'Calm', terms: ['calm', 'sensitive', 'soothing', 'botanical', 'repair'] },
    { id: 'hair', label: 'Hair Care', terms: ['hair', 'shampoo', 'conditioner', 'scalp'] },
  ];
  const selectedRoutine = routineOptions.find(option => option.id === routineConcern) || routineOptions[0];
  const routineMatches = visibleProducts
    .filter((product) => {
      const haystack = [product.name, product.category, product.subCategory, product.description, product.fullDetails].join(' ').toLowerCase();
      return selectedRoutine.terms.some(term => haystack.includes(term));
    })
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 3);
  const routineProducts = routineMatches.length > 0 ? routineMatches : bestSellers;
  const smartResults = visibleProducts
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
  const categoryStyles = [
    'from-[#ead8ca] to-[#c9847a]',
    'from-[#e3d5ea] to-[#9b7aa0]',
    'from-[#d8eadc] to-[#7a9b7e]',
    'from-[#ede0c8] to-[#9b9470]',
  ];
  const categoryCards = Array.from(new Set(visibleProducts.map(product => product.category).filter(Boolean)))
    .slice(0, 4)
    .map((category, index) => ({
      category,
      count: visibleProducts.filter(product => product.category === category).length,
      style: categoryStyles[index % categoryStyles.length],
    }));
  const reviewCards = visibleProducts
    .flatMap(product => (product.reviews || []).map(review => ({ ...review, productName: product.name })))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);
  const liveSaleEndLabel = settings.liveSaleEndTime
    ? new Date(settings.liveSaleEndTime).toLocaleString('en-PK', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Tonight';
  const showHomeHero = settings.showHomeHero !== false;
  const showHomeMarquee = settings.showHomeMarquee !== false;
  const showHomeSmartSearch = settings.showHomeSmartSearch !== false;
  const showHomeTrustBadges = settings.showHomeTrustBadges !== false;
  const showHomeCategories = settings.showHomeCategories !== false;
  const showHomeBestSellers = settings.showHomeBestSellers !== false;
  const showHomeLiveSalePromo = settings.showHomeLiveSalePromo !== false;
  const showHomeBenefits = settings.showHomeBenefits !== false;
  const showHomeSeoContent = settings.showHomeSeoContent !== false;
  const showHomeProductGrid = settings.showHomeProductGrid !== false;
  const showHomeReviews = settings.showHomeReviews !== false;

  return (
    <>
      <SEO
        title={settings.homeSeoTitle || 'Aabnoor Beauty | Premium Beauty & Skincare'}
        description={settings.homeSeoDescription || 'Shop Aabnoor Beauty for premium skincare, makeup, hair care, fragrance, live sale offers, secure checkout and order tracking.'}
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
            itemListElement: Array.from(new Set<string>(visibleProducts.map((product) => product.category))).map((category) => ({
              '@type': 'OfferCatalog',
              name: category,
              url: `${SEO_SITE_URL}/shop?category=${encodeURIComponent(category)}`,
            })),
          },
        }}
      />
      {showHomeHero && <Hero />}
      {showHomeMarquee && <Marquee />}
      {showHomeSmartSearch && (
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
                      <p className="font-sans text-xs text-[#1A1A1A]/65">Rs. {getActivePrice(product).toFixed(2)}</p>
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
                  <p className="mt-2 font-sans text-[11px] text-white/60">Rs. {getActivePrice(product).toFixed(2)}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
      )}
      {showHomeTrustBadges && <TrustBadges />}

      {showHomeCategories && categoryCards.length > 0 && (
        <section className="bg-[#faf6f1] py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-10">
              <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#c9847a] font-bold mb-2">Browse by Category</p>
              <h2 className="font-serif text-4xl md:text-5xl text-[#2c2826]">Your beauty, every need</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categoryCards.map((card) => (
                <button
                  key={card.category}
                  type="button"
                  onClick={() => scrollToShopAndFilter(card.category)}
                  className={`group relative aspect-[3/4] overflow-hidden rounded-[8px] bg-gradient-to-br ${card.style} text-left shadow-sm transition-transform duration-300 hover:-translate-y-1`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-white/10" />
                  <div className="absolute left-1/2 top-10 h-24 w-16 -translate-x-1/2 rounded-t-full rounded-b-[22px] bg-white/28 shadow-inner transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="font-serif text-3xl font-light text-white">{card.category}</p>
                    <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.18em] text-white/75">
                      {card.count} product{card.count === 1 ? '' : 's'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {showHomeBestSellers && bestSellers.length > 0 && (
        <section className="bg-[#faf6f1] py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#c9847a] font-bold mb-2">Customer Picks</p>
                <h2 className="font-serif text-4xl text-[#2c2826]">Most Loved Right Now</h2>
              </div>
              {settings.liveSaleActive && (
                <Link to="/live-sale" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-bold text-[#2c2826] border border-[#2c2826]/15 px-4 py-2 hover:bg-[#2c2826] hover:text-[#faf6f1] transition-colors">
                  <Clock className="w-3.5 h-3.5" />
                  Live Sale
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {bestSellers.map((product) => (
                <Link key={product.id} to={`/product/${product.id}`} className="group overflow-hidden rounded-[8px] bg-white border border-[#2c2826]/10 hover:border-[#c9847a] transition-colors">
                  <div className="aspect-[4/3] overflow-hidden bg-[#2c2826]/5">
                    <img src={product.imageUrl} alt={product.name} title={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" loading="lazy" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-sans text-[9px] uppercase tracking-widest font-bold text-[#c9847a]">{product.category}</span>
                      <span className="flex items-center gap-1 font-sans text-[10px] font-bold text-[#2c2826]/70">
                        <Star className="w-3 h-3 fill-[#b8975a] stroke-[#b8975a]" />
                        {(product.rating || 0).toFixed(1)}
                      </span>
                    </div>
                    <h3 className="font-serif text-xl text-[#2c2826] group-hover:text-[#8a4f48] transition-colors line-clamp-1">{getShortProductName(product.name)}</h3>
                    <p className="font-sans text-xs text-[#7a706a] line-clamp-2 mt-2">{product.description}</p>
                    <p className="font-serif text-lg text-[#2c2826] mt-4">Rs. {getActivePrice(product).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {showHomeLiveSalePromo && settings.liveSaleActive && (
        <section className="bg-[#2c2826] py-10">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="mb-2 flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.28em] text-[#c9847a]">
                <span className="h-2 w-2 rounded-full bg-[#e05050]" />
                Live Sale Active Now
              </p>
              <h2 className="font-serif text-3xl text-white">{settings.liveSaleTitle || 'Flash Sale - Up to 40% Off'}</h2>
              <p className="mt-2 max-w-2xl font-sans text-sm leading-6 text-[#9a9088]">
                {settings.liveSaleSubtitle} {settings.liveSaleDiscountText ? `Save ${settings.liveSaleDiscountText}.` : ''}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="border border-white/12 bg-white/[0.04] px-5 py-3">
                <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#9a9088]">Ends</p>
                <p className="mt-1 font-serif text-2xl text-[#ede0c8]">{liveSaleEndLabel}</p>
              </div>
              <Link to="/live-sale" className="inline-flex items-center justify-center gap-2 bg-[#faf6f1] px-6 py-3.5 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#2c2826] transition-colors hover:bg-[#ede0c8]">
                {liveSaleProducts.length > 0 ? `${liveSaleProducts.length} Deals` : 'View Sale'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}
      {showHomeBenefits && (
      <section className="bg-white py-20 border-y border-[#1A1A1A]/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 items-start">
          <div>
            <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#CDA185] font-bold mb-3">Why shoppers stay</p>
            <h2 className="font-serif italic text-4xl text-[#1A1A1A] leading-tight">A calmer beauty store with the details people need before checkout.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Droplets, title: 'Routine Matching', text: 'Shop by glow, hydration, calm support or hair care goals.' },
              { icon: PackageCheck, title: 'Order Tracking', text: 'Use your tracking number to follow order progress after checkout.' },
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
      )}
      {showHomeSeoContent && (
      <section className="bg-[#F9F7F2] border-y border-[#1A1A1A]/10 py-14">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-[0.85fr_1.15fr] gap-8 md:gap-12 items-start">
          <div>
            <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#CDA185] font-bold mb-3">Beauty Store in Pakistan</p>
            <h2 className="font-serif italic text-3xl md:text-4xl text-[#1A1A1A] leading-tight">Beauty essentials with clear delivery tracking.</h2>
          </div>
          <div className="space-y-4 font-sans text-sm leading-7 text-[#1A1A1A]/68">
            <p>
              Aabnoor Beaute curates daily beauty essentials for customers who want simple product discovery, clear pricing and a secure checkout experience. Browse skincare, hair care, and fragrance picks for gifting or personal routines.
            </p>
            <p>
              Every product page is built with readable descriptions, product images, pricing, availability, customer reviews and order support details. Checkout includes shipping information before purchase, and each order receives a tracking number by email so customers can follow delivery from the store to their address.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/shipping" className="text-[10px] uppercase tracking-[0.18em] font-bold border-b border-[#1A1A1A]/40 pb-1 hover:text-[#CDA185]">Shipping Details</Link>
              <Link to="/faq" className="text-[10px] uppercase tracking-[0.18em] font-bold border-b border-[#1A1A1A]/40 pb-1 hover:text-[#CDA185]">Beauty FAQs</Link>
              <Link to="/track" className="text-[10px] uppercase tracking-[0.18em] font-bold border-b border-[#1A1A1A]/40 pb-1 hover:text-[#CDA185]">Track Order</Link>
              <Link to="/shop" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] font-bold border-b border-[#1A1A1A]/40 pb-1 hover:text-[#CDA185]">
                Shop Now <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      )}
      {showHomeProductGrid && <ProductGrid />}
      {showHomeReviews && reviewCards.length > 0 && (
        <section className="bg-white py-16 border-y border-[#2c2826]/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-10 flex flex-col gap-3 text-center">
              <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#c9847a] font-bold">Customer Love</p>
              <h2 className="font-serif text-4xl md:text-5xl text-[#2c2826]">Customer feedback</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {reviewCards.map((review) => (
                <article key={review.id} className="rounded-[8px] border border-[#2c2826]/10 bg-[#faf6f1] p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex gap-1 text-[#b8975a]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} className={`h-3.5 w-3.5 ${index < review.rating ? 'fill-[#b8975a] stroke-[#b8975a]' : 'stroke-[#d9c9a8]'}`} />
                      ))}
                    </div>
                    <Quote className="h-5 w-5 text-[#c9847a]" />
                  </div>
                  <p className="font-serif text-xl italic leading-7 text-[#2c2826]">"{review.comment}"</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0d5d0] font-sans text-xs font-bold uppercase text-[#8a4f48]">
                      {review.user.slice(0, 1)}
                    </div>
                    <div>
                      <p className="font-sans text-xs font-bold text-[#2c2826]">{review.user}</p>
                      <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-[#7a706a]">{review.productName}</p>
                    </div>
                    <Heart className="ml-auto h-4 w-4 text-[#c9847a]" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
