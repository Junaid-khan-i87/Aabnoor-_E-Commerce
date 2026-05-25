import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Category } from './types';

interface CategoryContextType {
  activeCategory: Category;
  setActiveCategory: (category: Category) => void;
  scrollToShopAndFilter: (category: Category) => void;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  const scrollToShopAndFilter = (category: Category) => {
    setActiveCategory(category);
    setTimeout(() => {
      const shopSection = document.getElementById('shop');
      if (shopSection) {
        const top = shopSection.getBoundingClientRect().top + window.scrollY - 80; // 80px offset for header
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }, 50); // slight delay to allow rendering if needed
  };

  return (
    <CategoryContext.Provider value={{ activeCategory, setActiveCategory, scrollToShopAndFilter }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategory() {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error('useCategory must be used within a CategoryProvider');
  }
  return context;
}
