import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product } from './types';
import { products as initialProducts } from './data';

interface ProductContextType {
  productsList: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Product) => void;
  deleteProduct: (id: string) => void;
  saveProductsList: (newList: Product[]) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [productsList, setProductsList] = useState<Product[]>(() => {
    const saved = localStorage.getItem('aura_products');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            return initialProducts.map(p => ({...p, stock: 15}));
        }
    }
    return initialProducts.map(p => ({...p, stock: 15}));
  });

  const updateProductsStorage = (newProducts: Product[]) => {
    localStorage.setItem('aura_products', JSON.stringify(newProducts));
  };

  const addProduct = (product: Product) => {
    setProductsList(prev => {
      const next = [...prev, product];
      updateProductsStorage(next);
      return next;
    });
  };

  const updateProduct = (id: string, updatedProduct: Product) => {
    setProductsList(prev => {
      const next = prev.map(p => p.id === id ? updatedProduct : p);
      updateProductsStorage(next);
      return next;
    });
  };

  const deleteProduct = (id: string) => {
    setProductsList(prev => {
      const next = prev.filter(p => p.id !== id);
      updateProductsStorage(next);
      return next;
    });
  };

  const saveProductsList = (newList: Product[]) => {
    setProductsList(newList);
    updateProductsStorage(newList);
  };

  return (
    <ProductContext.Provider value={{ productsList, addProduct, updateProduct, deleteProduct, saveProductsList }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}
