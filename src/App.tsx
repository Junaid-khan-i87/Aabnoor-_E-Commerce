/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
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

import { HomePage } from './pages/HomePage';
import { TextPage } from './pages/TextPage';
import { ProductPage } from './pages/ProductPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { LiveSaleHubPage } from './pages/LiveSaleHubPage';
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

import { CheckoutPage } from './pages/CheckoutPage';
import { TrackPage } from './pages/TrackPage';
import { SmoothScroll } from './components/SmoothScroll';

import { SiteProvider } from './SiteContext';

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
                          <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/product/:id" element={<ProductPage />} />
                            <Route path="/admin" element={<AdminPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/checkout" element={<CheckoutPage />} />
                            <Route path="/track" element={<TrackPage />} />
                            <Route path="/live-sale" element={<LiveSaleHubPage />} />
                            <Route path="/privacy" element={<TextPage title="Privacy Policy" content={PrivacyContent} />} />
                            <Route path="/terms" element={<TextPage title="Terms of Service" content={TermsContent} />} />
                            <Route path="/shipping" element={<TextPage title="Shipping & Returns" content={ShippingContent} />} />
                            <Route path="/contact" element={<TextPage title="Contact Us" content={ContactContent} />} />
                            <Route path="/faq" element={<TextPage title="FAQs" content={FAQContent} />} />
                            <Route path="/our-story" element={<TextPage title="Our Story" content={StoryContent} />} />
                            <Route path="/sustainability" element={<TextPage title="Sustainability" content={SustainabilityContent} />} />
                            <Route path="/ingredients" element={<TextPage title="Ingredients" content={IngredientsContent} />} />
                            <Route path="/journal" element={<TextPage title="Journal" content={JournalContent} />} />
                          </Routes>
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
