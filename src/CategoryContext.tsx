import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category } from './types';
import { getShopHref } from './data/categories';

interface CategoryContextType {
  activeCategory: Category;
  setActiveCategory: (category: Category) => void;
  scrollToShopAndFilter: (category: Category, subcategory?: string) => void;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const navigate = useNavigate();

  const scrollToShopAndFilter = (category: Category, subcategory?: string) => {
    setActiveCategory(category);
    navigate(category === 'All' ? '/shop' : getShopHref(category, subcategory));
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
