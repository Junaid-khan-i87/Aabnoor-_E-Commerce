import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ProductVariant } from '../types';
import { useCart } from '../CartContext';
import { useLoyalty } from '../LoyaltyContext';
import { useProducts } from '../ProductContext';
import { useWishlist } from '../WishlistContext';
import { useSite } from '../SiteContext';
import { useUI } from '../UIContext';
import { Plus, Minus, ChevronDown, ChevronUp, X, ZoomIn, Heart, Star, Clock, Truck, ShieldCheck, MessageCircle, PackageCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SafeImage } from '../components/SafeImage';
import { SEO, SEO_SITE_URL } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { SUPPORT_EMAIL } from '../SiteContext';

export function ProductPage() {
  const { id } = useParams();
  const { productsList, updateProduct } = useProducts();
  const product = productsList.find(p => p.id === id);
  const { addToCart, setIsCartOpen } = useCart();
  const { redeemCoins, addCoins } = useLoyalty();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { currentUser, settings } = useSite();
  const { addToast } = useUI();
  const navigate = useNavigate();

  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState<string | null>('description');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  // Experience states: Interactive Ingredient Glossary & Reviews
  const [selectedGlossaryIngredient, setSelectedGlossaryIngredient] = useState<{ term: string; definition: string; benefit: string; safety: string } | null>(null);
  const [formName, setFormName] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState('');
  const [formSelectedTags, setFormSelectedTags] = useState<string[]>([]);
  const [formPhoto, setFormPhoto] = useState<string>('');
  
  const GLOSSARY_LOOKUP: Record<string, { term: string; definition: string; benefit: string; safety: string }> = {
    'aqua': { term: "Aqua (Deionized Water)", definition: "Pristine, multi-filtered deionized water that serves as the perfect non-reactive solvent, carrying micro-nutrients deep into pore pathways.", benefit: "Solvency, fluid transmission & barrier hydration", safety: "100% Skin Safe, hypoallergenic carrier." },
    'glycerin': { term: "Vegetal Glycerin", definition: "A premium botanical humectant that pulls deep moisture reservoirs from the atmosphere and binds them tightly to dry lipid columns.", benefit: "Water-binding, dryness repulsion & surface softening", safety: "Non-comedogenic, clinically-safe, skin-identical." },
    'niacinamide': { term: "Vitamin B3 (Niacinamide)", definition: "An outstanding cell-restoring vitamin that minimizes expanded pore sights, fades dark spots, regulates sebum flow, and improves barrier defense.", benefit: "Tone correction, pore contracting and brightness promotion", safety: "Safe for sensitive types, non-irritating." },
    'squalane': { term: "Plant-Derived Squalane", definition: "A highly stable, feather-light barrier lipid sourced from pure olives that mimics human skin's natural sebum to prevent water depletion.", benefit: "Weightless lock, line plumping & protective shield", safety: "Highly biocompatible, zero pore blockage." },
    'hyaluronic': { term: "Multi-Weight Hyaluronic Acid", definition: "A biomimetic hydration compound that acts like a microscopic sponge, locking up to 1,000 times its atomic weight in pure water.", benefit: "Sub-dermal plumping and line-smoothing hydration", safety: "Naturally present in skin matrix, completely non-reactive." },
    'peptides': { term: "Bio-Active Amino Peptides", definition: "Active structural chains that signal primary fibroblast cells to produce and reinforce collagen structures, promoting firmness.", benefit: "Elasticity improvement, anti-aging and firm contours", safety: "Dermatologically recommended, highly stable." },
    'botanical': { term: "Premium Botanical Blend", definition: "A calming infusion of luxury elderberry, chamomile and green tea phytonutrients which immediately calms skin redness and oxidants.", benefit: "Redness calms, soothing hydration & skin defense", safety: "Organic extracts, clean green process." },
    'charcoal': { term: "Activated Coconut Charcoal", definition: "Highly porous carbon lattices that pull blackheads, excess oil clogs, and environmental heavy micro-pollutants out of pore crevices.", benefit: "Pore detoxification, micro-exfoliation & matte finish", safety: "Natural purifier, deep flushing action." },
    'salicylic': { term: "Salicylic Acid (BHA)", definition: "A lipid-soluble exfoliating beta-hydroxy acid that penetrates deep within the oil ducts to dissolve sebum plugs and dry persistent breakout spots.", benefit: "Deep blackhead clearance and acne control", safety: "Clinically validated, skin-clarifying." }
  };

  const handleIngredientClick = (ingName: string) => {
    const key = Object.keys(GLOSSARY_LOOKUP).find(k => ingName.toLowerCase().includes(k)) || 'aqua';
    const match = GLOSSARY_LOOKUP[key] || {
      term: ingName,
      definition: "A premium formulation element selected for its deep-penetrating cosmetic integrity and skin compatibility within this luxury routine.",
      benefit: "Routine support & dermal texture soothing",
      safety: "100% Honest Formulation, safe for daily topical rituals."
    };
    setSelectedGlossaryIngredient(match);
  };

  const coinsRequiredForProduct = Math.floor((selectedVariant ? selectedVariant.price : product?.price || 0) * 10);

  const [isLoading, setIsLoading] = useState(true);

  // Dynamic gallery images based on category, prioritized by user uploaded custom images list if present
  const galleryImages = product ? (
    product.images && product.images.length > 0
      ? [product.imageUrl, ...product.images]
      : [
          product.imageUrl,
          product.category === 'Skin Care' 
            ? 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=800&auto=format&fit=crop'
            : product.category === 'Makeup'
            ? 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=800&auto=format&fit=crop'
            : product.category === 'Hair Care'
            ? 'https://images.unsplash.com/photo-1527799822367-a05eb5747734?q=80&w=800&auto=format&fit=crop'
            : 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?q=80&w=800&auto=format&fit=crop',
          product.category === 'Skin Care'
            ? 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=800&auto=format&fit=crop'
            : product.category === 'Makeup'
            ? 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop'
            : product.category === 'Hair Care'
            ? 'https://images.unsplash.com/photo-1595853035070-59a39fe84de3?q=80&w=800&auto=format&fit=crop'
            : 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=800&auto=format&fit=crop'
        ]
  ) : [];

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [id]);

  useEffect(() => {
    if (product?.isFlashSale && product.flashSaleEndTime) {

      const endTime = new Date(product.flashSaleEndTime).getTime();

      const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance < 0) {
          clearInterval(timer);
          setTimeLeft(null);
        } else {
          setTimeLeft({
            hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((distance % (1000 * 60)) / 1000)
          });
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [product]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!currentUser || !supabase) {
      addToast('Please sign in before posting a review.', 'error');
      return;
    }

    const { data: sessionResult } = await supabase.auth.getSession();
    const token = sessionResult.session?.access_token;
    if (!token) {
      addToast('Please sign in before posting a review.', 'error');
      return;
    }

    const response = await fetch('/api/submit-review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId: product.id,
        name: formName.trim(),
        rating: formRating,
        comment: formComment.trim(),
        tags: formSelectedTags,
        photos: formPhoto ? [formPhoto] : [],
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.product) {
      addToast(result.error || 'Review could not be saved.', 'error');
      return;
    }

    updateProduct(product.id, result.product, false);
    addCoins(15); // +15 Aabnoor Coins reward!
    addToast('Review posted! You received +15 Aabnoor Coins bonus.', 'success');

    // Wipe states
    setFormName('');
    setFormComment('');
    setFormSelectedTags([]);
    setFormPhoto('');
    setFormRating(5);
  };

  const handleRedeem = () => {
    if (!currentUser) {
      addToast('Please sign in to earn and redeem Aabnoor Coins', 'error');
      setRedeemMessage('Please sign in to earn and redeem Aabnoor Coins.');
      setTimeout(() => setRedeemMessage(null), 4000);
      return;
    }

    if (redeemCoins(coinsRequiredForProduct * quantity)) {
      addToast(`Redeemed ${product?.name} successfully!`, 'success');
      setRedeemMessage('Product successfully redeemed for free!');
      setTimeout(() => setRedeemMessage(null), 3500);
      
      const itemToAdd = selectedVariant
        ? { ...product, id: `${product.id}-${selectedVariant.name}-free`, name: `${product.name} - ${selectedVariant.name} (Free)`, price: 0 }
        : { ...product, id: `${product?.id}-free`, name: `${product?.name} (Free)`, price: 0 };
        
      for (let i = 0; i < quantity; i++) {
        // @ts-ignore
        addToCart(itemToAdd);
      }
      setIsCartOpen(true);
    } else {
      addToast('Insufficient Aabnoor Coins balance.', 'error');
      setRedeemMessage('Not enough Aabnoor Coins.');
      setTimeout(() => setRedeemMessage(null), 3000);
    }
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale(prev => Math.min(prev + 0.5, 3));
  };
  
  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale(prev => Math.max(prev - 0.5, 1));
  };
  
  const closeZoom = () => {
    setZoomedImage(null);
    setTimeout(() => {
        setZoomScale(1);
    }, 300);
  };
  
  useEffect(() => {
    window.scrollTo(0, 0);
    setQuantity(1);
    setOpenAccordion('description');
    if (product?.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [id, product]);

  if (isLoading) {
    return (
      <div className="pt-24 lg:pt-32 pb-24 max-w-7xl mx-auto px-6 animate-pulse">
        <div className="h-3 bg-[#1A1A1A]/10 rounded w-48 mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          <div className="flex flex-col gap-6">
             <div className="aspect-[3/4] w-full bg-[#1A1A1A]/10 rounded-sm"></div>
             <div className="grid grid-cols-2 gap-6">
                <div className="aspect-[3/4] w-full bg-[#1A1A1A]/10 rounded-sm"></div>
                <div className="aspect-[3/4] w-full bg-[#1A1A1A]/10 rounded-sm"></div>
             </div>
          </div>
          <div>
            <div className="h-3 bg-[#1A1A1A]/10 rounded w-24 mb-4"></div>
            <div className="h-10 lg:h-12 bg-[#1A1A1A]/10 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-[#1A1A1A]/10 rounded w-48 mb-6"></div>
            <div className="h-8 bg-[#1A1A1A]/10 rounded w-32 mb-8"></div>
            <div className="h-24 bg-[#1A1A1A]/10 rounded w-full mb-8"></div>
            <div className="h-14 bg-[#1A1A1A]/10 rounded-full w-full mb-4"></div>
            <div className="h-14 bg-[#1A1A1A]/10 rounded-full w-full mb-12"></div>
            
            <div className="space-y-4">
              <div className="h-16 bg-[#1A1A1A]/5 rounded-sm w-full border-b border-[#1A1A1A]/10"></div>
              <div className="h-16 bg-[#1A1A1A]/5 rounded-sm w-full border-b border-[#1A1A1A]/10"></div>
              <div className="h-16 bg-[#1A1A1A]/5 rounded-sm w-full border-b border-[#1A1A1A]/10"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-32 pb-24 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <h1 className="font-serif italic text-4xl mb-6">Product Not Found</h1>
        <Link to="/" className="text-[11px] uppercase tracking-[0.2em] border-b border-[#1A1A1A] pb-1 hover:text-[#1A1A1A]/60 transition-colors">Return to Shop</Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    const itemToAdd = selectedVariant
      ? { ...product, id: `${product.id}-${selectedVariant.name}`, name: `${product.name} - ${selectedVariant.name}`, price: selectedVariant.price }
      : product;

    for (let i = 0; i < quantity; i++) {
        addToCart(itemToAdd);
    }
  };

  const toggleAccordion = (section: string) => {
    setOpenAccordion(section);
  };

  const isWished = isInWishlist(product.id);
  const toggleWishlist = () => {
    if (isWished) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const basePrice = selectedVariant ? selectedVariant.price : product.price;
  const currentPrice = product.isFlashSale && product.flashSalePrice && !selectedVariant ? product.flashSalePrice : basePrice;
  const comparePrice = product.compareAtPrice && product.compareAtPrice > currentPrice
    ? product.compareAtPrice
    : product.price > currentPrice
      ? product.price
      : undefined;
  const savingsPercent = comparePrice ? Math.round(((comparePrice - currentPrice) / comparePrice) * 100) : 0;
  const seoDescription = `${product.name} from Aabnoor Beaute. ${product.description} Shop ${product.category.toLowerCase()} with secure checkout, delivery tracking and customer reviews.`;
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.fullDetails || product.description,
    image: galleryImages.map((image) => image.startsWith('http') ? image : `${SEO_SITE_URL}${image}`),
    brand: {
      '@type': 'Brand',
      name: 'Aabnoor Beaute',
    },
    category: product.category,
    sku: product.id,
    url: `${SEO_SITE_URL}/product/${product.id}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: currentPrice.toFixed(2),
      availability: product.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: `${SEO_SITE_URL}/product/${product.id}`,
      itemCondition: 'https://schema.org/NewCondition',
    },
    ...(product.rating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating.toFixed(1),
        reviewCount: product.reviews?.length || 1,
      },
    } : {}),
    ...(product.reviews?.length ? {
      review: product.reviews.slice(0, 5).map((review) => ({
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: review.user,
        },
        datePublished: review.date,
        reviewBody: review.comment,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: review.rating,
          bestRating: 5,
        },
      })),
    } : {}),
  };

  return (
    <div className="pt-24 lg:pt-32 pb-24 max-w-7xl mx-auto px-6">
      <SEO
        title={`${product.name} | ${product.category} | Aabnoor Beaute`}
        description={seoDescription.slice(0, 155)}
        canonicalPath={`/product/${product.id}`}
        image={product.imageUrl}
        type="product"
        jsonLd={productJsonLd}
      />
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 font-sans text-[9px] uppercase tracking-[0.2em] text-[#1A1A1A]/50 mb-8">
        <Link to="/" className="hover:text-[#1A1A1A] transition-colors">Home</Link>
        <span>/</span>
        <Link to="/#shop" className="hover:text-[#1A1A1A] transition-colors">Shop</Link>
        <span>/</span>
        <span className="text-[#1A1A1A]">{product.category}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
        {/* Left: Product Images (Desktop) */}
        <div className="hidden lg:flex flex-col gap-6">
          <div 
            className="aspect-[3/4] w-full bg-[#1A1A1A]/5 overflow-hidden cursor-pointer group relative border border-[#1A1A1A]/5"
            onClick={() => setZoomedImage(galleryImages[activeImageIndex])}
          >
            <SafeImage src={galleryImages[activeImageIndex]} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute left-4 top-4 flex flex-col gap-2">
              <span className="inline-flex items-center gap-1.5 bg-white/90 px-3 py-1.5 font-sans text-[9px] font-bold uppercase tracking-[0.18em] text-[#1A1A1A] shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-[#CDA185]" />
                100% Authentic
              </span>
              {savingsPercent > 0 && (
                <span className="w-fit bg-[#CDA185] px-3 py-1.5 font-sans text-[9px] font-bold uppercase tracking-[0.18em] text-white shadow-sm">
                  Save {savingsPercent}%
                </span>
              )}
            </div>
            <div className="absolute inset-0 bg-[#F9F7F2]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
               <div className="bg-white/80 p-3 rounded-full backdrop-blur-sm shadow-sm transition-transform duration-300 scale-90 group-hover:scale-100">
                 <ZoomIn className="w-6 h-6 text-[#1A1A1A]" />
               </div>
            </div>
          </div>
          {/* Gallery Sub-thumbnails */}
          <div className="grid grid-cols-3 gap-6">
            {galleryImages.map((img, idx) => (
              <div 
                key={idx}
                className={`aspect-[3/4] bg-[#1A1A1A]/5 overflow-hidden cursor-pointer transition-all duration-300 relative border ${
                  activeImageIndex === idx 
                    ? 'border-[#1A1A1A] scale-[1.03] shadow-md z-10' 
                    : 'border-[#1A1A1A]/10 opacity-70 hover:opacity-100 hover:border-[#1A1A1A]/40'
                }`}
                onClick={() => setActiveImageIndex(idx)}
              >
                <SafeImage src={img} alt={`${product.name} gallery image ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Left: Product Images (Mobile Carousel) */}
        <div 
          onScroll={(e) => {
            const container = e.currentTarget;
            const scrollPercent = container.scrollLeft / (container.scrollWidth - container.clientWidth || 1);
            const index = Math.min(
              galleryImages.length - 1,
              Math.max(0, Math.round(scrollPercent * (galleryImages.length - 1)))
            );
            if (index !== activeImageIndex) {
              setActiveImageIndex(index);
            }
          }}
          className="flex lg:hidden overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {galleryImages.map((img, idx) => (
             <div 
               key={idx}
               className="snap-center shrink-0 w-[85vw] aspect-[3/4] bg-[#1A1A1A]/5 overflow-hidden relative border border-[#1A1A1A]/5"
               onClick={() => {
                 setActiveImageIndex(idx);
                 setZoomedImage(img);
               }}
             >
               <SafeImage src={img} alt={`${product.name} view ${idx + 1}`} className="w-full h-full object-cover" />
               <div className="absolute left-3 top-3 bg-white/90 px-2.5 py-1.5 font-sans text-[8px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A] shadow-sm">
                 Authentic
               </div>
               <div className="absolute bottom-4 right-4 bg-white/80 p-2 rounded-full backdrop-blur-sm shadow-sm">
                 <ZoomIn className="w-4 h-4 text-[#1A1A1A]" />
               </div>
             </div>
          ))}
        </div>

        {/* Mobile indicators */}
        <div className="flex lg:hidden justify-center gap-1.5 mt-1 mb-6">
          {galleryImages.map((_, idx) => (
            <span 
              key={idx} 
              className={`h-1 rounded-full transition-all duration-300 ${activeImageIndex === idx ? 'w-5 bg-[#1A1A1A]' : 'w-1 bg-[#1A1A1A]/20'}`}
            />
          ))}
        </div>

        {/* Right: Product Details (Sticky) */}
        <div>
          <div className="sticky top-32">
            <div className="flex items-start justify-between mb-2">
              <p className="font-sans text-[11px] uppercase tracking-[0.3em] text-[#1A1A1A]/50">
                {product.category}
              </p>
              <button 
                onClick={toggleWishlist}
                className="p-2 -mr-2 bg-[#F9F7F2] hover:bg-[#1A1A1A]/5 rounded-full transition-colors flex items-center justify-center cursor-pointer"
                aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={`w-5 h-5 transition-colors ${isWished ? 'fill-red-500 stroke-red-500' : 'stroke-[#1A1A1A]'}`} />
              </button>
            </div>
            
            <h1 className="font-serif italic font-light text-4xl lg:text-5xl leading-tight text-[#1A1A1A] mb-4">
              {product.name}
            </h1>

            {product.rating && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-[#1A1A1A]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating!) ? 'fill-[#1A1A1A]' : 'stroke-[#1A1A1A]/30'} `} />
                  ))}
                </div>
                <span className="font-sans text-[11px] font-bold text-[#1A1A1A]/70 uppercase tracking-widest">{product.rating.toFixed(1)} / 5</span>
                {product.reviews && <span className="font-sans text-[11px] text-[#1A1A1A]/50 uppercase tracking-widest">({product.reviews.length} reviews)</span>}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex items-end gap-3 transition-all">
                <p className="font-serif text-2xl text-[#1A1A1A]">
                  Rs. {(currentPrice * quantity).toFixed(2)}
                </p>
                {comparePrice && (
                  <p className="font-sans text-sm text-[#1A1A1A]/40 line-through mb-1">
                    Rs. {(comparePrice * quantity).toFixed(2)}
                  </p>
                )}
              </div>
              {savingsPercent > 0 && (
                <span className="px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] font-bold rounded-sm border border-[#CDA185] bg-[#CDA185]/10 text-[#8b5f3d]">
                  Save {savingsPercent}%
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] font-bold rounded-sm border ${product.isLimitedEdition ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-[#1A1A1A]/20 text-[#1A1A1A]/60'}`}>
                  {product.stock === 0 ? 'Out of Stock' : (product.isLimitedEdition ? 'Limited Edition' : `${product.stock !== undefined ? product.stock : 12} In Stock`)}
                </span>
              </div>
            </div>

            {product.isFlashSale && product.flashSalePrice && timeLeft && (
              <div className="flex flex-col gap-2 p-4 bg-[#FF4C4C]/10 border border-[#FF4C4C]/20 rounded-sm mb-6">
                <div className="flex items-center gap-2 text-[#FF4C4C]">
                  <Clock className="w-4 h-4" />
                  <span className="font-sans text-[10px] uppercase font-bold tracking-widest">Flash Sale Ends In:</span>
                </div>
                <div className="flex gap-2 text-xl font-mono text-[#FF4C4C]">
                  <div className="bg-white px-2 py-1 shadow-sm rounded-sm">{String(timeLeft.hours).padStart(2, '0')}</div>:
                  <div className="bg-white px-2 py-1 shadow-sm rounded-sm">{String(timeLeft.minutes).padStart(2, '0')}</div>:
                  <div className="bg-white px-2 py-1 shadow-sm rounded-sm">{String(timeLeft.seconds).padStart(2, '0')}</div>
                </div>
              </div>
            )}
            
            <p className="font-sans text-sm text-[#1A1A1A]/70 leading-relaxed mb-8">
              {product.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              <div className="border border-[#1A1A1A]/10 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-[#CDA185]" />
                  <span className="font-sans text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]">Delivery Estimate</span>
                </div>
                <p className="font-sans text-xs text-[#1A1A1A]/65 leading-relaxed">
                  Standard delivery in 3-5 business days. Free shipping over Rs. {Number(settings.freeShippingThreshold).toFixed(0)}.
                </p>
              </div>
              <div className="border border-[#1A1A1A]/10 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-[#CDA185]" />
                  <span className="font-sans text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]">Secure Purchase</span>
                </div>
                <p className="font-sans text-xs text-[#1A1A1A]/65 leading-relaxed">
                  Authenticated checkout, order email, and backend tracking number are included.
                </p>
              </div>
              <div className="border border-[#1A1A1A]/10 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PackageCheck className="w-4 h-4 text-[#CDA185]" />
                  <span className="font-sans text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]">Product Confidence</span>
                </div>
                <p className="font-sans text-xs text-[#1A1A1A]/65 leading-relaxed">
                  Gallery images, ingredient notes, usage guidance, and customer reviews are available below.
                </p>
              </div>
              <a
                href={`mailto:${settings.storeEmail || SUPPORT_EMAIL}?subject=Aabnoor product question - ${encodeURIComponent(product.name)}`}
                className="border border-[#1A1A1A]/10 bg-white p-4 hover:border-[#CDA185] transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-4 h-4 text-[#CDA185]" />
                  <span className="font-sans text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]">Need Help?</span>
                </div>
                <p className="font-sans text-xs text-[#1A1A1A]/65 leading-relaxed">
                  Ask support before ordering: {settings.storeEmail || SUPPORT_EMAIL}.
                </p>
              </a>
            </div>

            {/* Variants Selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-8">
                <p className="font-sans text-[11px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A] mb-3">
                  Size
                </p>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-4 py-3 text-[10px] font-sans tracking-widest uppercase transition-colors ${
                        selectedVariant?.name === v.name
                          ? 'bg-[#1A1A1A] text-[#F9F7F2]'
                          : 'bg-transparent text-[#1A1A1A] border border-[#1A1A1A]/20 hover:border-[#1A1A1A]'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="flex flex-col gap-4 mb-12">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-[#1A1A1A]/20 rounded-full h-14 shrink-0">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-5 h-full hover:bg-[#1A1A1A]/5 transition-colors rounded-l-full flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-4 h-4 text-[#1A1A1A]" />
                  </button>
                  <span className="w-8 text-center font-sans text-sm">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(Math.min(product.stock !== undefined ? product.stock : 12, quantity + 1))}
                    className="px-5 h-full hover:bg-[#1A1A1A]/5 transition-colors rounded-r-full flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#1A1A1A]" />
                  </button>
                </div>
                <button 
                  aria-label={product.stock === 0 ? "Out of stock" : `Add ${product.name} to bag`}
                  disabled={product.stock === 0}
                  onClick={handleAddToCart}
                  className="flex-1 h-14 bg-[#1A1A1A] text-[#F9F7F2] rounded-full font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {product.stock === 0 ? 'Out of Stock' : `Add to Cart - Rs. ${(currentPrice * quantity).toFixed(2)}`}
                </button>
              </div>

              <button
                type="button"
                onClick={toggleWishlist}
                className="w-full h-12 border border-[#1A1A1A]/20 text-[#1A1A1A] rounded-full font-sans text-[10px] font-bold uppercase tracking-[0.18em] hover:border-[#CDA185] hover:text-[#8b5f3d] transition-colors flex items-center justify-center gap-2"
              >
                <Heart className={`w-4 h-4 ${isWished ? 'fill-red-500 stroke-red-500' : ''}`} />
                {isWished ? 'Saved to Wishlist' : 'Save to Wishlist'}
              </button>
              
              <button
                disabled={product.stock === 0}
                onClick={handleRedeem}
                className="w-full h-14 border border-[#1A1A1A] text-[#1A1A1A] rounded-full font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Redeem for {coinsRequiredForProduct * quantity} Coins
              </button>
              {redeemMessage && (
                 <p className={`text-center font-sans text-[10px] uppercase font-bold tracking-widest ${redeemMessage.includes('Not enough') ? 'text-red-500' : 'text-green-600'}`}>
                   {redeemMessage}
                 </p>
              )}
            </div>

            {/* Product Tabs */}
            <div className="mt-8 mb-12 border border-[#1A1A1A]/10 bg-white">
              <div className="flex overflow-x-auto border-b border-[#1A1A1A]/10">
                {[
                  ['description', 'Description'],
                  ['ingredients', 'Ingredients'],
                  ['usage', 'How to Use'],
                  ['reviews', `Reviews (${product.reviews?.length || 0})`],
                  ...(product.advantages?.length ? [['advantages', 'Benefits']] : []),
                  ...(product.warnings ? [['warnings', 'Warnings']] : []),
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleAccordion(key)}
                    className={`min-w-fit px-5 py-4 font-sans text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${
                      openAccordion === key
                        ? 'bg-[#1A1A1A] text-[#F9F7F2]'
                        : 'text-[#1A1A1A]/55 hover:text-[#1A1A1A]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-6 font-sans text-sm leading-7 text-[#1A1A1A]/75">
                {openAccordion === 'description' && (
                  <p>{product.fullDetails || product.description}</p>
                )}

                {openAccordion === 'ingredients' && (
                  <div className="text-xs leading-relaxed text-[#1A1A1A]/80">
                    <p className="mb-3 text-[10px] text-[#CDA185] uppercase tracking-wider font-extrabold">Click any underlined ingredient to learn why it is included.</p>
                    <div className="flex flex-wrap gap-x-2 gap-y-1.5 pt-1">
                      {(product.ingredients || 'Aqua (Water), Glycerin, Niacinamide, Squalane, Hyaluronic Acid, Peptides Complex, Botanical Extract Blend').split(',').map((ing, i) => {
                        const trimmed = ing.trim();
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleIngredientClick(trimmed)}
                            className="text-left border-b border-dashed border-[#CDA185] hover:text-[#CDA185] font-semibold transition-colors cursor-pointer outline-none pb-0.5"
                          >
                            {trimmed}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-4 border-t border-[#1A1A1A]/5 pt-3 text-[10px] italic text-[#1A1A1A]/50">Formulated without parabens, silicones, fragrances, or phthalates where applicable.</p>
                  </div>
                )}

                {openAccordion === 'usage' && (
                  <p>{product.howToUse || 'Apply to clean, dry skin morning and evening. Gently press into face and neck until fully absorbed.'}</p>
                )}

                {openAccordion === 'advantages' && product.advantages && (
                  <ul className="list-disc pl-4 space-y-1">
                    {product.advantages.map((adv, i) => (
                      <li key={i}>{adv}</li>
                    ))}
                  </ul>
                )}

                {openAccordion === 'warnings' && (
                  <p className="text-red-600/90 font-sans text-xs leading-relaxed font-semibold">
                    {product.warnings || 'Patch test before first use and avoid contact with eyes.'}
                  </p>
                )}

                {openAccordion === 'reviews' && (
                  <p className="font-sans text-xs uppercase tracking-[0.18em] text-[#1A1A1A]/45">Review history and submission form are shown below.</p>
                )}
              </div>
            </div>

            {/* Accordions */}
            <div className="hidden">
              <AccordionItem 
                title="Description" 
                isOpen={openAccordion === 'description'} 
                onClick={() => toggleAccordion('description')}
              >
                <p>{product.fullDetails || product.description}</p>
              </AccordionItem>
              <AccordionItem 
                title="Ingredients (Click to learn)" 
                isOpen={openAccordion === 'ingredients'} 
                onClick={() => toggleAccordion('ingredients')}
              >
                <div className="font-sans text-xs leading-relaxed text-[#1A1A1A]/80">
                  <p className="mb-3 text-[10px] text-[#CDA185] uppercase tracking-wider font-extrabold flex items-center gap-1">💡 Click any underlined ingredient below to discover its molecular skin gains</p>
                  <div className="flex flex-wrap gap-x-2 gap-y-1.5 pt-1">
                    {(product.ingredients || 'Aqua (Water), Glycerin, Niacinamide, Squalane, Hyaluronic Acid, Peptides Complex, Botanical Extract Blend').split(',').map((ing, i) => {
                      const trimmed = ing.trim();
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleIngredientClick(trimmed)}
                          className="text-left border-b border-dashed border-[#CDA185] hover:text-[#CDA185] font-semibold transition-colors cursor-pointer outline-none pb-0.5"
                        >
                          {trimmed}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-4 border-t border-[#1A1A1A]/5 pt-3 text-[10px] italic text-[#1A1A1A]/50">100% Formulation Honesty. Formulated strictly without parabens, silicones, fragrances, or phthalates.</p>
                </div>
              </AccordionItem>
              <AccordionItem 
                title="How to Use" 
                isOpen={openAccordion === 'usage'} 
                onClick={() => toggleAccordion('usage')}
              >
                <p>{product.howToUse || 'Apply to clean, dry skin morning and evening. Gently press into face and neck until fully absorbed. For optimal results, follow with your preferred Aabnoor Moderne protocols.'}</p>
              </AccordionItem>
              {product.advantages && product.advantages.length > 0 && (
                <AccordionItem 
                  title="Advantages" 
                  isOpen={openAccordion === 'advantages'} 
                  onClick={() => toggleAccordion('advantages')}
                >
                  <ul className="list-disc pl-4 space-y-1">
                    {product.advantages.map((adv, i) => (
                      <li key={i}>{adv}</li>
                    ))}
                  </ul>
                </AccordionItem>
              )}
              {product.disadvantages && product.disadvantages.length > 0 && (
                <AccordionItem 
                  title="Disadvantages" 
                  isOpen={openAccordion === 'disadvantages'} 
                  onClick={() => toggleAccordion('disadvantages')}
                >
                  <ul className="list-disc pl-4 space-y-1 text-[#1A1A1A]/70">
                    {product.disadvantages.map((dis, i) => (
                      <li key={i}>{dis}</li>
                    ))}
                  </ul>
                </AccordionItem>
              )}
              {product.warnings && (
                <AccordionItem 
                  title="Warnings & Precautions" 
                  isOpen={openAccordion === 'warnings'} 
                  onClick={() => toggleAccordion('warnings')}
                >
                  <p className="text-red-600/90 font-sans text-xs leading-relaxed font-semibold">
                    ⚠️ {product.warnings}
                  </p>
                </AccordionItem>
              )}
            </div>
            
            {/* Reviews Section */}
            <div className={`pt-8 border-t border-[#1A1A1A]/10 mt-12 text-left ${openAccordion === 'reviews' ? '' : 'hidden'}`}>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-8">
                <div>
                  <h3 className="font-serif italic text-2xl text-[#1A1A1A]">Customer Experiences</h3>
                  <p className="font-sans text-[10px] text-[#1A1A1A]/50 uppercase tracking-widest mt-0.5">Honest review galleries with certified texture logs & formulation tags.</p>
                </div>
                <div className="flex items-center gap-1 bg-[#CDA185]/10 text-[#CDA185] px-3.5 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider self-start md:self-auto">
                  ⭐️ {product.rating || 4.8} / 5 average rating
                </div>
              </div>

              {/* Existing Reviews List */}
              {product.reviews && product.reviews.length > 0 ? (
                <div className="space-y-8 mb-12">
                  {product.reviews.map((review) => (
                    <div key={review.id} className="pb-8 border-b border-[#1A1A1A]/5 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold font-sans text-sm text-[#1A1A1A]">{review.user}</span>
                        <span className="text-[10px] text-[#1A1A1A]/50 uppercase tracking-wide">{new Date(review.date).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex text-[#1A1A1A]">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-[#1A1A1A]' : 'stroke-[#1A1A1A]/30'} `} />
                          ))}
                        </div>
                        <span className="w-1.5 h-1.5 bg-[#1A1A1A]/10 rounded-full" />
                        <span className="font-sans text-[9px] uppercase font-bold text-green-750 tracking-wider">★ Certified Purchase</span>
                      </div>

                      <p className="font-sans text-sm text-[#1A1A1A]/80 leading-relaxed max-w-xl italic">
                        "{review.comment}"
                      </p>

                      {/* Review tag badges */}
                      {review.tags && review.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3.5">
                          {review.tags.map((tag, idx) => (
                            <span key={idx} className="bg-[#1A1A1A]/5 text-[#1A1A1A]/70 text-[9px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
                              ✦ {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Review photo snapshots */}
                      {review.photos && review.photos.length > 0 && (
                        <div className="flex gap-2.5 mt-4">
                          {review.photos.map((ph, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => setZoomedImage(ph)}
                              className="w-16 h-16 bg-[#1A1A1A]/5 rounded overflow-hidden border border-[#1A1A1A]/10 cursor-zoom-in group relative"
                            >
                              <img src={ph} alt="Review texture snapshot" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] uppercase font-bold">Zoom</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-sans text-xs text-[#1A1A1A]/50 italic mb-8">No customer logs filed yet. Be the first to catalog your skin experience!</p>
              )}

              {/* Experience submission form (Write a Review) */}
              <form onSubmit={handleReviewSubmit} className="bg-white border border-[#1A1A1A]/10 p-6 sm:p-8 rounded-xl shadow-sm mt-12 max-w-2xl text-left">
                <span className="inline-flex items-center gap-1 bg-[#CDA185]/15 text-[#CDA185] text-[9pt] uppercase font-bold tracking-[0.2em] px-3 py-1 rounded mb-4">
                   ✨ Earn +15 Aabnoor Loyalty Coins
                </span>
                <h4 className="font-serif italic text-xl text-[#1A1A1A] mb-1">Catalog Your Skin Ritual</h4>
                <p className="font-sans text-[10px] text-[#1A1A1A]/50 uppercase tracking-widest mb-6 font-semibold">File your ratings and upload snapshots to advise other skincare seekers.</p>

                <div className="space-y-5">
                  {/* Name and Stars row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/60 block mb-1.5">Your Name</label>
                      <input 
                        required
                        type="text" 
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Eleanor Vance" 
                        className="w-full bg-[#F9F7F2] border border-[#1A1A1A]/10 rounded px-3 py-2 font-sans text-xs focus:outline-none focus:border-[#CDA185]"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/60 block mb-1.5">Rating Experience</label>
                      <div className="flex gap-2.5 items-center py-2">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setFormRating(val)}
                            className="p-1 hover:scale-110 transition-transform cursor-pointer bg-transparent border-0"
                          >
                            <Star className={`w-5 h-5 ${val <= formRating ? 'fill-[#CDA185] text-[#CDA185]' : 'text-[#1A1A1A]/30'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Commment Area */}
                  <div>
                    <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/60 block mb-1.5">Your Notes / Experience Commentary</label>
                    <textarea
                      required
                      rows={3}
                      value={formComment}
                      onChange={(e) => setFormComment(e.target.value)}
                      placeholder="Detail how the product blends on your skin, its fragrance notes, or texture observations..."
                      className="w-full bg-[#F9F7F2] border border-[#1A1A1A]/10 rounded p-3 font-sans text-xs focus:outline-none focus:border-[#CDA185] resize-none"
                    />
                  </div>

                  {/* Add review tag selectors */}
                  <div>
                    <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/60 block mb-2">Descriptive Experience Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {["Hydrating", "Non-sticky", "Soothing", "Melts Nicely", "Silk Texture", "Absorbs Fast", "Fine Aroma"].map((tag) => {
                        const isSelected = formSelectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setFormSelectedTags(prev => 
                                isSelected ? prev.filter(t => t !== tag) : [...prev, tag]
                              );
                            }}
                            className={`px-3 py-1 rounded text-[10px] font-sans font-semibold border uppercase tracking-wider transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-[#1A1A1A] text-white border-transparent shadow-sm' 
                                : 'bg-transparent text-[#1A1A1A]/60 border-[#1A1A1A]/10 hover:border-[#1A1A1A]'
                            }`}
                          >
                             {isSelected ? '✓ ' : ''}{tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Texture Snapshots upload widget */}
                  <div>
                    <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/60 block mb-2">Configure Texture Snap File (Simulation)</label>
                    <p className="font-sans text-[9px] text-[#1A1A1A]/40 mb-3 uppercase tracking-wider leading-relaxed">Choose a physical texture micrograph preset to attach high-fidelity visual evidence to your skin report.</p>
                    
                    <div className="grid grid-cols-4 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormPhoto('')}
                        className={`border text-[9.5px] uppercase tracking-wider font-bold rounded p-2 flex items-center justify-center cursor-pointer ${formPhoto === '' ? 'border-[#CDA185] bg-[#CDA185]/5 text-[#CDA185]' : 'border-[#1A1A1A]/10 text-[#1A1A1A]/60 hover:border-[#1A1A1A]'}`}
                      >
                         No snap
                      </button>
                      {[
                        { name: 'Rosehip Oil', url: 'https://images.unsplash.com/photo-1601049676099-e7ed07d825b0?q=80&w=300&auto=format&fit=crop' },
                        { name: 'Cloud Cream', url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=300&auto=format&fit=crop' },
                        { name: 'Dewy Gel', url: 'https://images.unsplash.com/photo-1617897903246-719242758050?q=80&w=300&auto=format&fit=crop' }
                      ].map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFormPhoto(item.url)}
                           className={`border rounded overflow-hidden relative group p-0 cursor-pointer ${formPhoto === item.url ? 'border-2 border-[#CDA185]' : 'border-[#1A1A1A]/10'}`}
                        >
                          <img src={item.url} alt={item.name} className="w-full h-10 object-cover" />
                          <div className="absolute inset-0 bg-[#1A1A1A]/70 flex items-center justify-center text-[8px] uppercase tracking-widest font-bold text-white opacity-90">
                             {item.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit"
                    className="w-full py-3 bg-[#1A1A1A] hover:bg-[#CDA185] hover:scale-[1.01] text-[#F9F7F2] font-sans text-[10px] font-bold uppercase tracking-widest transition-all rounded shadow-md cursor-pointer mt-4"
                  >
                    Submit Certified Skin Report
                  </button>
                </div>
              </form>
            </div>

            {/* Ingredient Glossary Explanation Modal Overlay */}
            <AnimatePresence>
              {selectedGlossaryIngredient && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
                  onClick={() => setSelectedGlossaryIngredient(null)}
                >
                  <motion.div
                    initial={{ scale: 0.93, y: 15 }}
                     animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.93, y: 15 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#F9F7F2] border-2 border-[#CDA185] p-6 max-w-md w-full rounded-2xl shadow-2xl relative cursor-default text-left"
                  >
                    <button
                      onClick={() => setSelectedGlossaryIngredient(null)}
                      className="absolute top-4 right-4 p-1.5 hover:bg-[#1A1A1A]/5 rounded-full cursor-pointer bg-transparent border-0"
                    >
                      <X className="w-4 h-4 text-[#1A1A1A]" />
                    </button>

                    <span className="inline-flex items-center gap-1.5 bg-[#CDA185]/10 text-[#CDA185] text-[9px] uppercase font-bold tracking-[0.2em] px-3.5 py-1.5 rounded-full mb-4">
                       ⚛️ Clinical Ingredient Registry
                    </span>
                    
                    <h3 className="font-serif italic text-2xl text-[#1A1A1A] mb-2">
                       {selectedGlossaryIngredient.term}
                    </h3>
                    
                    <div className="space-y-4 font-sans text-xs text-[#1A1A1A]/80 leading-relaxed pt-2">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-[#CDA185] tracking-widest">Educational Description</span>
                        <p className="mt-1 text-sm bg-white p-3 rounded border border-[#1A1A1A]/5 italic">
                          "{selectedGlossaryIngredient.definition}"
                        </p>
                      </div>

                      <div>
                        <span className="block text-[9px] uppercase font-bold text-[#CDA185] tracking-widest">Active Skin Benefits</span>
                        <div className="mt-1 bg-green-50 text-green-800 p-2.5 rounded font-semibold text-[11px] uppercase tracking-wide">
                           ✦ {selectedGlossaryIngredient.benefit}
                        </div>
                      </div>

                      <div>
                        <span className="block text-[9px] uppercase font-bold text-[#CDA185] tracking-widest">Formulation Safety Profile</span>
                        <p className="mt-1 text-xs text-[#1A1A1A]/60">
                          {selectedGlossaryIngredient.safety}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-[#1A1A1A]/10 pt-4 flex justify-between items-center">
                      <span className="text-[10px] text-green-700 font-bold uppercase tracking-wider flex items-center gap-1">✓ Verified Honest Formulations</span>
                      <button
                        onClick={() => setSelectedGlossaryIngredient(null)}
                         className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#CDA185] text-[#F9F7F2] font-sans text-[9px] uppercase tracking-widest font-bold rounded transition-colors cursor-pointer"
                      >
                         Close Registry
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>

      {/* You May Also Like */}
      <div className="mt-32 mb-12">
        <h3 className="font-serif italic text-3xl text-[#1A1A1A] mb-8 text-center">You May Also Like</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {productsList.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4).map(p => (
            <div key={p.id} className="group cursor-pointer flex flex-col" onClick={() => navigate(`/product/${p.id}`)}>
              <div className="aspect-[3/4] bg-[#1A1A1A]/5 overflow-hidden mb-4 rounded-sm">
                <SafeImage src={p.imageUrl} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <h4 className="font-serif text-sm text-[#1A1A1A] group-hover:text-[#1A1A1A]/70 transition-colors line-clamp-1">{p.name}</h4>
              <p className="font-serif italic text-sm text-[#1A1A1A]">Rs. {Number(p.price).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 cursor-pointer"
            onClick={closeZoom}
          >
            <div className="absolute top-6 right-6 flex items-center gap-4 z-10">
              <button 
                onClick={handleZoomOut} 
                disabled={zoomScale <= 1} 
                className="p-3 bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 rounded-full disabled:opacity-30 transition-colors cursor-pointer"
                aria-label="Zoom out"
              >
                <Minus className="w-5 h-5 text-[#1A1A1A]" />
              </button>
              <button 
                onClick={handleZoomIn} 
                disabled={zoomScale >= 3} 
                className="p-3 bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 rounded-full disabled:opacity-30 transition-colors cursor-pointer"
                aria-label="Zoom in"
              >
                <Plus className="w-5 h-5 text-[#1A1A1A]" />
              </button>
              <button 
                onClick={closeZoom} 
                className="p-3 bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 rounded-full transition-colors ml-4 cursor-pointer"
                aria-label="Close zoom"
              >
                <X className="w-5 h-5 text-[#1A1A1A]" />
              </button>
            </div>
            
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
              <motion.img 
                src={zoomedImage} 
                alt="Zoomed product" 
                animate={zoomScale > 1 ? { scale: zoomScale } : { scale: 1, x: 0, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                drag={zoomScale > 1}
                dragElastic={0.1}
                dragMomentum={false}
                whileDrag={{ cursor: 'grabbing' }}
                className={`max-h-[85vh] max-w-[90vw] object-contain select-none shadow-2xl ${zoomScale > 1 ? 'cursor-grab' : 'cursor-default'}`}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccordionItem({ title, isOpen, onClick, children }: { title: string, isOpen: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <div className="border-b border-[#1A1A1A]/10">
      <button 
        onClick={onClick}
        className="w-full flex items-center justify-between py-6 group cursor-pointer"
      >
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A] group-hover:text-[#1A1A1A]/60 transition-colors">{title}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-[#1A1A1A]" /> : <ChevronDown className="w-4 h-4 text-[#1A1A1A]" />}
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out font-sans text-sm text-[#1A1A1A]/70 leading-relaxed ${isOpen ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        {children}
      </div>
    </div>
  );
}
