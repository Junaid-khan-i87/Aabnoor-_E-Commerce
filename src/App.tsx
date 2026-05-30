/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CartProvider } from './CartContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
import { CategoryProvider } from './CategoryContext';
import { UIProvider } from './UIContext';
import { LoyaltyProvider } from './LoyaltyContext';
import { ProductProvider } from './ProductContext';
import { OrderProvider } from './OrderContext';
import { WishlistProvider } from './WishlistContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Cart } from './components/Cart';
import { MobileMenu } from './components/MobileMenu';
import { SearchOverlay } from './components/SearchOverlay';
import { LoginOverlay } from './components/LoginOverlay';
import { WishlistOverlay } from './components/WishlistOverlay';

import {
  PrivacyContent,
  TermsContent,
  ShippingContent,
  StoryContent,
  SustainabilityContent,
  IngredientsContent,
  JournalContent,
  ContactContent,
  FAQContent,
} from './pages/pageContent';

import { SmoothScroll } from './components/SmoothScroll';

import { SiteProvider } from './SiteContext';

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const TextPage = lazy(() => import('./pages/TextPage').then((module) => ({ default: module.TextPage })));
const ProductPage = lazy(() => import('./pages/ProductPage').then((module) => ({ default: module.ProductPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const LiveSaleHubPage = lazy(() => import('./pages/LiveSaleHubPage').then((module) => ({ default: module.LiveSaleHubPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage })));
const TrackPage = lazy(() => import('./pages/TrackPage').then((module) => ({ default: module.TrackPage })));
const CartPage = lazy(() => import('./pages/CartPage').then((module) => ({ default: module.CartPage })));

function PageFallback() {
  return (
    <div className="min-h-[55vh] flex items-center justify-center bg-[#F9F7F2]">
      <div className="h-10 w-10 border border-[#1A1A1A]/15 border-t-[#1A1A1A] rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <SmoothScroll>
      <BrowserRouter>
        <ScrollToTop />
        <SiteProvider>
        <UIProvider>
          <LoyaltyProvider>
            <ProductProvider>
              <OrderProvider>
                <CategoryProvider>
                  <WishlistProvider>
                    <CartProvider>
                      <div className="min-h-screen bg-[#F9F7F2] text-[#1A1A1A] flex flex-col font-sans selection:bg-[#1A1A1A] selection:text-[#F9F7F2]">
                        <Header />
                        <main className="flex-1 shrink-0">
                          <Suspense fallback={<PageFallback />}>
                            <Routes>
                              <Route path="/" element={<HomePage />} />
                              <Route path="/product/:id" element={<ProductPage />} />
                              <Route path="/admin" element={<AdminPage />} />
                              <Route path="/profile" element={<ProfilePage />} />
                              <Route path="/cart" element={<CartPage />} />
                              <Route path="/checkout" element={<CheckoutPage />} />
                              <Route path="/track" element={<TrackPage />} />
                              <Route path="/live-sale" element={<LiveSaleHubPage />} />
                              <Route path="/privacy" element={<TextPage title="Privacy Policy" content={PrivacyContent} canonicalPath="/privacy" />} />
                              <Route path="/terms" element={<TextPage title="Terms of Service" content={TermsContent} canonicalPath="/terms" />} />
                              <Route path="/shipping" element={<TextPage title="Shipping & Returns" content={ShippingContent} canonicalPath="/shipping" />} />
                              <Route path="/contact" element={<TextPage title="Contact Us" content={ContactContent} canonicalPath="/contact" />} />
                              <Route path="/faq" element={<TextPage title="FAQs" content={FAQContent} canonicalPath="/faq" />} />
                              <Route path="/our-story" element={<TextPage title="Our Story" content={StoryContent} canonicalPath="/our-story" />} />
                              <Route path="/sustainability" element={<TextPage title="Sustainability" content={SustainabilityContent} canonicalPath="/sustainability" />} />
                              <Route path="/ingredients" element={<TextPage title="Ingredients" content={IngredientsContent} canonicalPath="/ingredients" />} />
                              <Route path="/journal" element={<TextPage title="Journal" content={JournalContent} canonicalPath="/journal" />} />
                            </Routes>
                          </Suspense>
                        </main>
                        <Footer />
                        <Cart />
                        <MobileMenu />
                        <SearchOverlay />
                        <LoginOverlay />
                        <WishlistOverlay />
                      </div>
                    </CartProvider>
                  </WishlistProvider>
                </CategoryProvider>
              </OrderProvider>
            </ProductProvider>
          </LoyaltyProvider>
        </UIProvider>
      </SiteProvider>
      </BrowserRouter>
    </SmoothScroll>
  );
}
