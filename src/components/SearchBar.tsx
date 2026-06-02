import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../CartContext';
import { useProducts } from '../ProductContext';
import { useUI } from '../UIContext';
import { SafeImage } from './SafeImage';
import { getActivePrice } from '../lib/pricing';

interface SearchBarProps {
  onResultSelect?: () => void;
  placeholder?: string;
}

const TRENDING_SEARCHES = ['Serum', 'Cleansing Balm', 'Lipstick', 'Mascara', 'Hair Care', 'Oud'];

export function SearchBar({ onResultSelect, placeholder = 'Search products, category, concern, or price...' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { productsList } = useProducts();
  const { addToCart } = useCart();
  const { addToast } = useUI();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return productsList
      .filter((product) => {
        const haystack = [
          product.name,
          product.category,
          product.subCategory,
          product.description,
          product.fullDetails,
          product.price.toString(),
        ].join(' ').toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 6);
  }, [productsList, query]);

  const showPanel = isFocused;

  const closePanel = () => {
    setIsFocused(false);
    onResultSelect?.();
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleProductClick = (productId: string) => {
    closePanel();
    navigate(`/product/${productId}`);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocused(false);
        }
      }}
    >
      <div className="flex min-h-11 items-center gap-3 rounded-full border border-[#2c2826]/18 bg-white px-4 shadow-sm transition-colors focus-within:border-[#8a4f48] focus-within:ring-2 focus-within:ring-[#CDA185]/35">
        <Search className="h-4 w-4 shrink-0 text-[#8a4f48]" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onFocus={() => setIsFocused(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsFocused(true);
          }}
          placeholder={placeholder}
          className="h-10 w-full bg-transparent font-sans text-[13px] text-[#2c2826] outline-none placeholder:text-[#5f5650]"
          aria-label="Search Aabnoor products"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="rounded-full p-1 text-[#5f5650] transition-colors hover:bg-[#2c2826]/5 hover:text-[#2c2826]"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-[8px] border border-[#2c2826]/12 bg-[#fffaf7] p-3 shadow-2xl">
          {query.trim() ? (
            <>
              <p className="mb-3 font-sans text-[9px] font-bold uppercase tracking-[0.18em] text-[#6f625c]">
                {results.length > 0 ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'No results'}
              </p>
              <div className="space-y-2">
                {results.map((product) => (
                  <div
                    key={product.id}
                    className="group flex items-center gap-3 rounded-[6px] border border-transparent p-2 transition-colors hover:border-[#CDA185]/70 hover:bg-[#F9F7F2]"
                  >
                    <button
                      type="button"
                      onClick={() => handleProductClick(product.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <SafeImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-16 w-14 shrink-0 rounded-[4px] object-cover bg-[#2c2826]/5"
                        sizes="56px"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-sans text-[9px] font-bold uppercase tracking-widest text-[#8a4f48]">
                          {product.category}
                        </span>
                        <span className="mt-1 block truncate font-serif text-base text-[#2c2826] group-hover:text-[#8a4f48]">
                          {product.name}
                        </span>
                        <span className="mt-1 block font-sans text-xs text-[#5f5650]">
                          Rs. {getActivePrice(product).toFixed(2)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        addToCart(product);
                        addToast(`${product.name} added to your bag`, 'success');
                        closePanel();
                      }}
                      className="hidden rounded-full bg-[#2c2826] p-2 text-white transition-colors hover:bg-[#8a4f48] sm:inline-flex"
                      aria-label={`Add ${product.name} to cart`}
                    >
                      <ShoppingBag className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div>
              <p className="mb-3 font-sans text-[9px] font-bold uppercase tracking-[0.18em] text-[#6f625c]">
                Trending searches
              </p>
              <div className="flex flex-wrap gap-2">
                {TRENDING_SEARCHES.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setQuery(tag);
                      setIsFocused(true);
                    }}
                    className="rounded-full border border-[#2c2826]/12 px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-widest text-[#2c2826] transition-colors hover:border-[#2c2826] hover:bg-[#2c2826] hover:text-white"
                  >
                    {tag}
                  </button>
                ))}
                <Link
                  to="/shop"
                  onClick={closePanel}
                  className="rounded-full border border-[#CDA185] bg-[#CDA185] px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-widest text-[#2c2826] transition-colors hover:bg-[#b88768]"
                >
                  View all
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
