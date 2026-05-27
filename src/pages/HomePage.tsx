import React, { useState } from 'react';
import { Hero } from '../components/Hero';
import { Marquee } from '../components/Marquee';
import { ProductGrid } from '../components/ProductGrid';
import { SocialGallery } from '../components/SocialGallery';
import { useProducts } from '../ProductContext';
import { useSite } from '../SiteContext';
import { Link } from 'react-router-dom';
import { Clock, PackageCheck, Search, ShieldCheck, Sparkles, Star, Truck } from 'lucide-react';
import { SEO, SEO_SITE_URL } from '../components/SEO';

export function HomePage() {
  const { productsList } = useProducts();
  const { settings } = useSite();
  const [smartQuery, setSmartQuery] = useState('');
  const bestSellers = [...productsList]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 3);
  const liveSaleProducts = productsList.filter(product => product.isFlashSale && product.flashSalePrice);
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
        title="Aabnoor Beaute | Premium Skincare, Makeup, Hair Care and Fragrance"
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
      <section className="bg-[#F9F7F2] pt-10 pb-4">
        <div className="max-w-4xl mx-auto px-6">
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
                    <img src={product.imageUrl} alt={product.name} className="w-12 h-14 object-cover bg-[#1A1A1A]/5" referrerPolicy="no-referrer" />
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
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
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
      <ProductGrid />
      <SocialGallery />
    </>
  );
}
