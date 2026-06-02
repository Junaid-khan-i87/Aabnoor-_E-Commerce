import React from 'react';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronRight, Coins, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUI } from '../UIContext';
import { useCategory } from '../CategoryContext';
import { useLoyalty } from '../LoyaltyContext';
import { useProducts } from '../ProductContext';
import { useSite } from '../SiteContext';
import { SearchBar } from './SearchBar';
import { getShopHref, withProductCounts } from '../data/categories';

export function MobileMenu() {
  const { isMenuOpen, setIsMenuOpen, setIsLoginOpen } = useUI();
  const { scrollToShopAndFilter } = useCategory();
  const { coins } = useLoyalty();
  const { currentUser, siteName } = useSite();
  const { productsList } = useProducts();
  const navigate = useNavigate();
  const navCategories = withProductCounts(productsList);

  const handleNav = (category: string, subcategory?: string) => {
    setIsMenuOpen(false);
    setTimeout(() => scrollToShopAndFilter(category, subcategory), 120);
  };

  return (
    <AnimatePresence>
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-[#F9F7F2]"
        >
          <div className="flex h-20 items-center justify-between border-b border-[#1A1A1A]/10 p-6">
            <div className="flex select-none flex-col items-start leading-none">
              <span className="font-serif text-2xl font-normal capitalize leading-none tracking-[0.08em] text-[#1A1A1A]">
                {siteName}
              </span>
              <span className="mr-[-0.5em] mt-1 font-sans text-[7px] font-bold uppercase leading-none tracking-[0.5em] text-[#8a4f48]">
                beaute
              </span>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="-mr-2 rounded-full p-2 transition-colors hover:bg-[#1A1A1A]/5"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 text-[#1A1A1A]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mb-6 flex items-center gap-2 rounded-full bg-[#1A1A1A]/5 px-4 py-2">
              <Coins className="h-5 w-5 text-[#1A1A1A]" aria-hidden="true" />
              <span className="font-sans text-xs font-bold tracking-[0.1em] text-[#1A1A1A]">
                {coins} Aabnoor Coins
              </span>
            </div>

            <div className="mb-8">
              <SearchBar onResultSelect={() => setIsMenuOpen(false)} />
            </div>

            <nav className="border-t border-[#1A1A1A]/10">
              {navCategories.map((category, index) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <Disclosure>
                    {({ open }) => (
                      <div className="border-b border-[#1A1A1A]/10">
                        <div className="flex items-center gap-2 py-4">
                          <Link
                            to={getShopHref(category.name)}
                            onClick={() => handleNav(category.name)}
                            className="group flex flex-1 items-center justify-between"
                          >
                            <span className="font-serif text-3xl italic text-[#1A1A1A] transition-colors group-hover:text-[#8a4f48]">
                              {category.name}
                            </span>
                            <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/45">
                              {category.count}
                            </span>
                          </Link>
                          <DisclosureButton
                            className="rounded-full p-2 text-[#1A1A1A]/55 transition-colors hover:bg-[#1A1A1A]/5 hover:text-[#1A1A1A]"
                            aria-label={`${open ? 'Close' : 'Open'} ${category.name} subcategories`}
                          >
                            <ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} />
                          </DisclosureButton>
                        </div>
                        <DisclosurePanel className="pb-4">
                          <div className="grid grid-cols-1 gap-2">
                            {category.subcategories.map((subcategory) => (
                              <Link
                                key={subcategory.name}
                                to={getShopHref(category.name, subcategory.name)}
                                onClick={() => handleNav(category.name, subcategory.name)}
                                className="flex items-center justify-between rounded-[8px] bg-white px-4 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f5650] transition-colors hover:bg-[#1A1A1A] hover:text-[#F9F7F2]"
                              >
                                {subcategory.name}
                                <span>{subcategory.count}</span>
                              </Link>
                            ))}
                            {category.isSale && (
                              <Link
                                to="/live-sale"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-between rounded-[8px] bg-[#CDA185] px-4 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-[#1A1A1A] transition-colors hover:bg-[#b88768]"
                              >
                                Live Sale Page
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                              </Link>
                            )}
                          </div>
                        </DisclosurePanel>
                      </div>
                    )}
                  </Disclosure>
                </motion.div>
              ))}
            </nav>

            <div className="mt-8 space-y-5 text-center">
              <p className="font-sans text-xs uppercase tracking-widest text-[#1A1A1A]/45">
                Experience Modules
              </p>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/live-sale');
                }}
                className="font-serif text-2xl font-bold leading-none text-[#1A1A1A] transition-colors hover:text-[#8a4f48]"
              >
                Live Sale
              </button>
              <div className="mx-auto h-px w-12 bg-[#1A1A1A]/20" />
              {currentUser ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/45">
                    Logged in as {currentUser}
                  </span>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate('/profile');
                    }}
                    className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#8a4f48] transition-colors hover:text-[#1A1A1A]"
                  >
                    My Account & History
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsLoginOpen(true);
                  }}
                  className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A] transition-colors hover:text-[#8a4f48]"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
