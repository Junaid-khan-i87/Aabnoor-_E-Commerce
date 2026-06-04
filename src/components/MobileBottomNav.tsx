import React from 'react';
import { Home, Heart, Search, User, Grid2X2 } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useUI } from '../UIContext';
import { useSite } from '../SiteContext';
import { useWishlist } from '../WishlistContext';

export function MobileBottomNav() {
  const { setIsSearchOpen, setIsLoginOpen } = useUI();
  const { currentUser, settings } = useSite();
  const { wishlist } = useWishlist();
  const navigate = useNavigate();
  if (settings.enableMobileBottomNav === false) return null;

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.08em] transition-colors ${
      isActive ? 'text-[#c97a82]' : 'text-[#2d2426]/70'
    }`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[90] border-t border-[#2d2426]/10 bg-[#fffaf7]/95 shadow-[0_-10px_30px_rgba(45,36,38,0.08)] backdrop-blur md:hidden">
      <div className="mx-auto grid h-16 max-w-md grid-cols-5">
        <NavLink to="/" className={itemClass} aria-label="Home">
          <Home className="h-5 w-5" />
          Home
        </NavLink>
        <NavLink to="/shop" className={itemClass} aria-label="Categories">
          <Grid2X2 className="h-5 w-5" />
          Shop
        </NavLink>
        {settings.enableHeaderSearch !== false && (
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-[#2d2426]/70 transition-colors hover:text-[#c97a82]"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
          Search
        </button>
        )}
        {settings.enableHeaderSearch === false && (
          <NavLink to="/track" className={itemClass} aria-label="Track Order">
            <Search className="h-5 w-5" />
            Track
          </NavLink>
        )}
        {settings.enableWishlistFeature !== false ? (
        <NavLink to="/wishlist" className={itemClass} aria-label="Wishlist">
          <span className="relative">
            <Heart className="h-5 w-5" />
            {wishlist.length > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c97a82] px-1 text-[9px] text-white">
                {wishlist.length}
              </span>
            )}
          </span>
          Wishlist
        </NavLink>
        ) : (
          <NavLink to="/track" className={itemClass} aria-label="Track Order">
            <Heart className="h-5 w-5" />
            Track
          </NavLink>
        )}
        <button
          type="button"
          onClick={() => (currentUser ? navigate('/profile') : setIsLoginOpen(true))}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-[#2d2426]/70 transition-colors hover:text-[#c97a82]"
          aria-label="Account"
        >
          <User className="h-5 w-5" />
          Account
        </button>
      </div>
    </nav>
  );
}
