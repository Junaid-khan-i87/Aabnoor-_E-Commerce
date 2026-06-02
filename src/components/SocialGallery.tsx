import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

const IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1596755389378-c11ddeff8cf5?q=75&w=360&auto=format&fit=crop',
    alt: 'Aabnoor skincare routine with cosmetic cream texture',
  },
  {
    src: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=75&w=360&auto=format&fit=crop',
    alt: 'Aabnoor makeup products arranged for daily beauty routine',
  },
  {
    src: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=75&w=360&auto=format&fit=crop',
    alt: 'Aabnoor serum bottle and premium skincare packaging',
  },
  {
    src: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=75&w=360&auto=format&fit=crop',
    alt: 'Aabnoor hair care and beauty styling inspiration',
  },
  {
    src: 'https://images.unsplash.com/photo-1512496015851-a1cbfc38ae49?q=75&w=360&auto=format&fit=crop',
    alt: 'Aabnoor beauty shelf with makeup and skincare essentials',
  },
];

export function SocialGallery() {
  return (
    <section className="py-24 bg-[#F9F7F2] border-t border-[#1A1A1A]/10">
      <div className="max-w-7xl mx-auto px-6 mb-16 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h2 className="font-serif italic font-light text-4xl lg:text-5xl text-[#1A1A1A] mb-4">
            Beauty Shelf Inspiration
          </h2>
          <p className="font-sans text-[#1A1A1A]/60 max-w-sm">
            Browse routine ideas, product textures, and simple beauty essentials before choosing your next order.
          </p>
        </div>
        <div className="flex items-center gap-2 px-6 py-3 border border-[#1A1A1A]/20 rounded-full font-sans text-[10px] uppercase font-bold tracking-[0.2em] text-[#1A1A1A]">
          <ShieldCheck className="w-4 h-4" />
          Curated Picks
        </div>
      </div>

      <div className="w-full overflow-hidden px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {IMAGES.map((image, i) => (
            <motion.div
              key={image.src}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="relative aspect-square md:aspect-[4/5] bg-[#1A1A1A]/5 overflow-hidden group cursor-pointer"
            >
              <img
                src={image.src}
                alt={image.alt}
                title={image.alt}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[#1A1A1A]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-[#F9F7F2]" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
