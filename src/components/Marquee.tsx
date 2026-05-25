import React from 'react';
import { motion } from 'motion/react';

export function Marquee() {
  const items = [
    "CRUELTY FREE", "•", "SUSTAINABLE PACKAGING", "•", 
    "DERMATOLOGIST TESTED", "•", "VEGAN FORMULAS", "•",
    "CLEAN INGREDIENTS", "•"
  ];
  
  // Duplicate array multiple times for continuous scrolling effect
  const multipliedItems = [...items, ...items, ...items, ...items, ...items, ...items, ...items, ...items];

  return (
    <div className="w-full bg-[#1A1A1A] text-[#F9F7F2] py-4 overflow-hidden flex whitespace-nowrap">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
        className="flex gap-8 items-center"
      >
        {multipliedItems.map((text, idx) => (
          <span 
            key={idx} 
            className={`font-sans uppercase tracking-[0.3em] font-medium ${text === '•' ? 'text-xs text-[#F9F7F2]/50' : 'text-xs'}`}
          >
            {text}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
