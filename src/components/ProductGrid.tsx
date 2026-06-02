import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Category, Product } from '../types';
import { useCart } from '../CartContext';
import { useCategory } from '../CategoryContext';
import { useProducts } from '../ProductContext';
import { useWishlist } from '../WishlistContext';
import { useUI } from '../UIContext';
import { useNavigate } from 'react-router-dom';
import { useSite } from '../SiteContext';
import { Heart, Star } from 'lucide-react';
import { getActivePrice, isFlashSaleActive } from '../lib/pricing';
import { getShortProductName } from '../lib/productText';

export function ProductCard({ product, addToCart }: { product: Product; addToCart: (p: Product) => void; key?: string | number }) {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const navigate = useNavigate();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { addToast } = useUI();
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const displayName = getShortProductName(product.name);

  // Smooth springs for mouse movement
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  // Map mouse position to rotation angle
  const rotateX = useTransform(mouseYSpring, [0, 1], ["8deg", "-8deg"]);
  const rotateY = useTransform(mouseXSpring, [0, 1], ["-8deg", "8deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  const isWished = isInWishlist(product.id);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWished) {
      removeFromWishlist(product.id);
      addToast(`Removed ${product.name} from Wishlist`, 'info');
    } else {
      addToWishlist(product);
      addToast(`Added ${product.name} to Wishlist`, 'success');
    }
  };

  const activePrice = getActivePrice(product);
  const reviewCount = product.reviews?.length || 0;
  const currentPrice = product.variants?.[0] ? product.variants[0].price : product.price;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const itemToAdd = product.variants?.[0]
      ? { ...product, id: `${product.id}-${product.variants[0].name}`, name: `${product.name} - ${product.variants[0].name}`, price: product.variants[0].price }
      : product;

    addToCart(itemToAdd);
    addToast(`Added ${itemToAdd.name} to your bag`, 'success');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="group flex flex-col font-sans"
      style={{ perspective: 1200 }}
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => navigate(`/product/${product.id}`)}
        style={{ rotateX, rotateY }}
        className="relative aspect-[3/4] bg-white overflow-hidden mb-6 group-hover:shadow-2xl transition-all duration-500 cursor-pointer border border-[#1A1A1A]/5"
      >
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-2">
            {product.isNew && (
              <div className="bg-[#1A1A1A] text-[#F9F7F2] rounded-full text-[9px] uppercase font-sans tracking-[0.2em] px-3 py-1 font-bold shadow-sm pointer-events-auto w-fit">
                New
              </div>
            )}
            {isFlashSaleActive(product) && (
              <div className="bg-[#FF4C4C] text-[#F9F7F2] rounded-full text-[9px] uppercase font-sans tracking-[0.2em] px-3 py-1 font-bold shadow-sm pointer-events-auto w-fit font-bold">
                Flash Sale
              </div>
            )}
            {product.compareAtPrice && product.compareAtPrice > currentPrice && (
              <div className="bg-[#1A1A1A] text-[#F9F7F2] rounded-full text-[9px] uppercase font-sans tracking-[0.2em] px-3 py-1 font-bold shadow-sm pointer-events-auto w-fit">
                Sale
              </div>
            )}
          </div>
          <button 
            onClick={toggleWishlist}
            className="p-2 bg-[#F9F7F2] hover:bg-white border border-[#1A1A1A]/10 shadow-sm rounded-full pointer-events-auto transition-colors cursor-pointer"
            aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart 
              className={`w-4 h-4 transition-colors ${isWished ? 'fill-red-500 stroke-red-500' : 'stroke-[#1A1A1A]'} `} 
            />
          </button>
        </div>
        <motion.img
          style={{ scale: 1.05 }}
          src={imgSrc || product.imageUrl}
          alt={product.name}
          onError={() => setImgSrc("https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80")}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.12]"
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        />
      </motion.div>
      
      <div className="flex-1 flex flex-col cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
        <div className="flex items-center justify-between mb-1">
          <p className="font-sans text-[10px] uppercase tracking-widest text-[#1A1A1A]/50 font-bold">
            {product.category}
          </p>
        </div>
        <h3 className="font-serif text-xl text-[#1A1A1A] leading-snug mb-2 transition-colors group-hover:text-[#CDA185]">
          {displayName}
        </h3>
        <div className="mb-3 flex items-center gap-2 font-sans text-[11px] font-bold text-[#5f5650]">
          <span className="flex items-center gap-0.5 text-[#b8975a]" aria-label={`${(product.rating || 0).toFixed(1)} out of 5 stars`}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className={`h-3.5 w-3.5 ${index < Math.round(product.rating || 0) ? 'fill-[#b8975a] stroke-[#b8975a]' : 'stroke-[#d9c9a8]'}`}
              />
            ))}
          </span>
          <span>{(product.rating || 0).toFixed(1)}</span>
          <span className="text-[#2c2826]/25">/</span>
          <span>{reviewCount} review{reviewCount === 1 ? '' : 's'}</span>
        </div>
        <p className="font-sans text-xs text-[#5f5650] line-clamp-2 mb-4">
          {product.description}
        </p>
        <div className="mt-auto space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-serif italic text-lg text-[#1A1A1A]">
              Rs. {activePrice.toFixed(2)}
            </p>
            {product.compareAtPrice && product.compareAtPrice > activePrice && (
              <p className="font-sans text-xs text-[#6f625c] line-through">
                Rs. {Number(product.compareAtPrice).toFixed(2)}
              </p>
            )}
          </div>
          <button
            disabled={product.stock === 0}
            onClick={handleAddToCart}
            className="w-full rounded-full bg-[#CDA185] px-4 py-3 text-center font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#2c2826] shadow-sm transition-colors hover:bg-[#b88768] focus:outline-none focus:ring-2 focus:ring-[#8a4f48] focus:ring-offset-2 focus:ring-offset-[#F9F7F2] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {product.stock === 0 ? 'Out of Stock' : `Add to Cart - Rs. ${activePrice.toFixed(2)}`}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function ProductGrid() {
  const { activeCategory, setActiveCategory } = useCategory();
  const { addToCart } = useCart();
  const { productsList } = useProducts();
  const { subCategories } = useSite();
  const [activeSubCategory, setActiveSubCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('popular');
  const [saleOnly, setSaleOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  React.useEffect(() => {
    setActiveSubCategory('All');
  }, [activeCategory]);

  React.useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [activeCategory, activeSubCategory, sortBy, saleOnly, inStockOnly]);

  const uniqueCategories = Array.from(new Set<string>(productsList.map(p => p.category)));
  const categories: Category[] = ['All', ...uniqueCategories];

  let filteredProducts = activeCategory === 'All'
    ? [...productsList]
    : productsList.filter(p => p.category === activeCategory);

  if (activeCategory !== 'All' && activeSubCategory !== 'All') {
    filteredProducts = filteredProducts.filter(p => p.subCategory === activeSubCategory);
  }

  if (saleOnly) {
    filteredProducts = filteredProducts.filter(p => isFlashSaleActive(p) || Boolean(p.compareAtPrice && p.compareAtPrice > p.price));
  }

  if (inStockOnly) {
    filteredProducts = filteredProducts.filter(p => (p.stock ?? 1) > 0);
  }

  if (sortBy === 'low-to-high') {
    filteredProducts.sort((a, b) => getActivePrice(a) - getActivePrice(b));
  } else if (sortBy === 'high-to-low') {
    filteredProducts.sort((a, b) => getActivePrice(b) - getActivePrice(a));
  } else if (sortBy === 'newest') {
    filteredProducts.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
  } else {
    // popular
    filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  return (
    <section id="shop" className="py-24 lg:py-32 bg-[#F9F7F2]">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-8">
          <div>
            <h2 className="font-serif italic font-light text-5xl lg:text-6xl tracking-tight text-[#1A1A1A] mb-4">
              Curated Edit
            </h2>
            <p className="font-sans text-xs uppercase tracking-widest font-bold text-[#1A1A1A]/60 max-w-sm">
              Discover our essentials for transformative beauty. Showing {filteredProducts.length} item{filteredProducts.length === 1 ? '' : 's'}
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col items-start md:items-end gap-6 w-full md:w-auto">
            <div className="flex flex-wrap gap-2 font-sans text-[10px] uppercase tracking-[0.2em] font-bold justify-start md:justify-end w-full">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 border rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                    activeCategory === cat 
                      ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#F9F7F2]' 
                      : 'border-[#1A1A1A]/10 text-[#1A1A1A] hover:border-[#1A1A1A] hover:bg-[#1A1A1A]/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sub-category pills */}
            {activeCategory !== 'All' && (
              <div className="flex flex-wrap gap-1.5 font-sans text-[9px] uppercase tracking-wider font-medium justify-start md:justify-end w-full">
                {['All', ...Array.from(new Set([
                  ...(subCategories[activeCategory] || []),
                  ...productsList.filter(p => p.category === activeCategory).map(p => p.subCategory).filter(Boolean) as string[]
                ]))].map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setActiveSubCategory(sub)}
                    className={`px-3 py-1.5 border rounded-full whitespace-nowrap transition-all cursor-pointer ${
                      activeSubCategory === sub
                        ? 'border-[#CDA185] bg-[#CDA185] text-white'
                        : 'border-[#1A1A1A]/10 text-[#1A1A1A]/60 hover:border-[#1A1A1A] hover:text-[#1A1A1A]'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}
            
            {/* Sorting Control */}
            <div className="flex flex-wrap items-center gap-6 text-[10px] uppercase tracking-widest font-sans font-bold justify-start md:justify-end w-full md:w-auto">
              <label className="flex items-center gap-2 cursor-pointer text-[#1A1A1A]/70 hover:text-[#1A1A1A]">
                <input
                  type="checkbox"
                  checked={saleOnly}
                  onChange={(e) => setSaleOnly(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#1A1A1A]"
                />
                Sale Only
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-[#1A1A1A]/70 hover:text-[#1A1A1A]">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#1A1A1A]"
                />
                In Stock
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[#1A1A1A]/60">Sort By:</span>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-b border-[#1A1A1A] text-[#1A1A1A] outline-none pb-1 font-bold cursor-pointer"
                >
                  <option value="popular">Popular (Rating)</option>
                  <option value="newest">Newest Arrival</option>
                  <option value="low-to-high">Price: Low to High</option>
                  <option value="high-to-low">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters Chips Bar */}
        {(activeCategory !== 'All' || sortBy !== 'popular' || saleOnly || inStockOnly) && (
          <div className="flex flex-wrap items-center gap-2 mb-12 font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A] animate-slide-in-right">
            <span className="text-[#1A1A1A]/50 pr-1">Active filters:</span>
            {activeCategory !== 'All' && (
              <span className="flex items-center gap-1.5 bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 px-3 py-1.5 rounded-full text-[#1A1A1A]/80">
                Category: {activeCategory}
                <button onClick={() => setActiveCategory('All')} className="hover:text-[#CDA185] ml-1 font-bold cursor-pointer text-xs">x</button>
              </span>
            )}
            {sortBy !== 'popular' && (
              <span className="flex items-center gap-1.5 bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 px-3 py-1.5 rounded-full text-[#1A1A1A]/80">
                Sort: {sortBy}
                <button onClick={() => setSortBy('popular')} className="hover:text-[#CDA185] ml-1 font-bold cursor-pointer text-xs">x</button>
              </span>
            )}
            {saleOnly && (
              <span className="flex items-center gap-1.5 bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 px-3 py-1.5 rounded-full text-[#1A1A1A]/80">
                Sale only
                <button onClick={() => setSaleOnly(false)} className="hover:text-[#CDA185] ml-1 font-bold cursor-pointer text-xs">x</button>
              </span>
            )}
            {inStockOnly && (
              <span className="flex items-center gap-1.5 bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 px-3 py-1.5 rounded-full text-[#1A1A1A]/80">
                In stock
                <button onClick={() => setInStockOnly(false)} className="hover:text-[#CDA185] ml-1 font-bold cursor-pointer text-xs">x</button>
              </span>
            )}
            <button 
              onClick={() => {
                setActiveCategory('All');
                setSortBy('popular');
                setSaleOnly(false);
                setInStockOnly(false);
              }}
              className="text-[#CDA185] hover:text-[#1A1A1A] underline cursor-pointer transition-colors duration-200 ml-2"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
          <AnimatePresence mode="popLayout">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <motion.div
                    key={`skeleton-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col animate-pulse"
                  >
                    <div className="relative aspect-[3/4] bg-[#1A1A1A]/10 mb-6 rounded-sm"></div>
                    <div className="flex flex-col">
                      <div className="flex justify-between items-center mb-2">
                         <div className="h-3 bg-[#1A1A1A]/10 rounded w-16"></div>
                         <div className="h-3 bg-[#1A1A1A]/10 rounded w-8"></div>
                      </div>
                      <div className="h-6 bg-[#1A1A1A]/10 rounded w-3/4 mb-4"></div>
                      <div className="mt-8 flex justify-between items-end">
                          <div className="h-6 bg-[#1A1A1A]/10 rounded w-20"></div>
                          <div className="h-8 bg-[#1A1A1A]/10 rounded-full w-24"></div>
                      </div>
                    </div>
                  </motion.div>
                ))
              : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} addToCart={addToCart} />
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-1 sm:col-span-2 lg:col-span-4 flex flex-col items-center justify-center py-20 text-center"
                  >
                    <p className="font-serif italic text-2xl text-[#1A1A1A] mb-2">No products found</p>
                    <p className="font-sans text-sm text-[#1A1A1A]/60">Try adjusting your filters or search criteria.</p>
                  </motion.div>
                )
            }
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
