import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Product } from './types';
import { deleteEntity, listEntities, replaceEntities, upsertEntity } from './lib/storeApi';

interface ProductContextType {
  productsList: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Product) => void;
  deleteProduct: (id: string) => void;
  saveProductsList: (newList: Product[]) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [productsList, setProductsList] = useState<Product[]>([]);

  useEffect(() => {
    let isMounted = true;

    listEntities<Product>('products').then(remoteProducts => {
      if (isMounted) {
        setProductsList(remoteProducts || []);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const addProduct = (product: Product) => {
    setProductsList(prev => {
      const next = [...prev, product];
      upsertEntity('products', product);
      return next;
    });
  };

  const updateProduct = (id: string, updatedProduct: Product) => {
    setProductsList(prev => {
      const next = prev.map(p => p.id === id ? updatedProduct : p);
      upsertEntity('products', updatedProduct);
      return next;
    });
  };

  const deleteProduct = (id: string) => {
    setProductsList(prev => {
      const next = prev.filter(p => p.id !== id);
      deleteEntity('products', id);
      return next;
    });
  };

  const saveProductsList = (newList: Product[]) => {
    setProductsList(newList);
    replaceEntities('products', newList);
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
