import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIContextType {
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
  isLoginOpen: boolean;
  setIsLoginOpen: (isOpen: boolean) => void;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (isOpen: boolean) => void;
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <UIContext.Provider
      value={{
        isSearchOpen,
        setIsSearchOpen,
        isMenuOpen,
        setIsMenuOpen,
        isLoginOpen,
        setIsLoginOpen,
        isWishlistOpen,
        setIsWishlistOpen,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
      
      {/* Global Toast Renderer */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </UIContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void; key?: any }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgStyles = {
    success: 'bg-[#1A1A1A] text-[#F9F7F2] border-l-4 border-[#8FA89B]',
    error: 'bg-[#8c2a2a] text-[#F9F7F2] border-l-4 border-red-400',
    info: 'bg-[#2b2b2b] text-[#F9F7F2] border-l-4 border-[#CDA185]'
  };

  return (
    <div
      onClick={() => onDismiss(toast.id)}
      className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 shadow-lg font-sans text-xs tracking-wider uppercase font-medium animate-slide-in-right cursor-pointer hover:opacity-90 transition-opacity ${bgStyles[toast.type]}`}
      style={{
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)'
      }}
    >
      <span>{toast.message}</span>
      <button 
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
        className="text-[#F9F7F2]/60 hover:text-[#F9F7F2] ml-auto text-[10px]"
        aria-label="Dismiss notification"
      >
        X
      </button>
    </div>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
