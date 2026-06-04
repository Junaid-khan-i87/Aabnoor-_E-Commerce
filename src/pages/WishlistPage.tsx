import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { useCart } from '../CartContext';
import { ProductCard } from '../components/ProductGrid';
import { SEO } from '../components/SEO';
import { useWishlist } from '../WishlistContext';

export function WishlistPage() {
  const { wishlist } = useWishlist();
  const { addToCart } = useCart();

  return (
    <main className="min-h-screen bg-[#faf6f0] pt-40 pb-24">
      <SEO
        title="Wishlist | Aabnoor Beauty"
        description="Save your favorite Aabnoor Beauty products and shop them later."
        canonicalPath="/wishlist"
      />
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.3em] text-[#c97a82]">
              Saved Beauty Picks
            </p>
            <h1 className="font-serif text-5xl font-light leading-none text-[#2d2426]">
              Your Wishlist
            </h1>
            <p className="mt-4 max-w-xl font-sans text-sm leading-6 text-[#8a7070]">
              Keep your favorite skincare, makeup, fragrance, and hair care products in one place.
            </p>
          </div>
          {wishlist.length > 0 && (
            <Link
              to="/shop"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#2d2426]/15 px-5 py-3 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#2d2426] transition-colors hover:border-[#2d2426] hover:bg-[#2d2426] hover:text-white"
            >
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </Link>
          )}
        </div>

        {wishlist.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[8px] border border-[#2d2426]/10 bg-[#fffaf7] px-6 py-16 text-center shadow-sm">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#c97a82]/10 text-[#c97a82]">
              <Heart className="h-7 w-7" />
            </div>
            <h2 className="font-serif text-3xl text-[#2d2426]">No favorites saved yet</h2>
            <p className="mt-3 max-w-md font-sans text-sm leading-6 text-[#8a7070]">
              Tap the heart on any product to build a quick shopping shortlist.
            </p>
            <Link
              to="/shop"
              className="mt-7 inline-flex items-center justify-center rounded-full bg-[#2d2426] px-7 py-3.5 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#c97a82]"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-4">
            {wishlist.map((product) => (
              <ProductCard key={product.id} product={product} addToCart={addToCart} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
