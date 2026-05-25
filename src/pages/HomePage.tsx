import React from 'react';
import { Hero } from '../components/Hero';
import { Marquee } from '../components/Marquee';
import { ProductGrid } from '../components/ProductGrid';
import { SocialGallery } from '../components/SocialGallery';

export function HomePage() {
  return (
    <>
      <Hero />
      <Marquee />
      <ProductGrid />
      <SocialGallery />
    </>
  );
}
