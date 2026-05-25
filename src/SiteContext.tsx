import React, { createContext, useContext, useState, ReactNode } from 'react';

import { Coupon } from './types';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  coins: number;
  joined: string;
  warnings: number;
  status?: 'Active' | 'Blocked';
}

const MOCK_USERS: UserAccount[] = [
  { id: 'USR-001', email: 'jane.doe@example.com', name: 'Jane Doe', coins: 145, joined: '2025-11-12', warnings: 0, status: 'Active' },
  { id: 'USR-002', email: 'smith.john@example.com', name: 'John Smith', coins: 20, joined: '2026-02-05', warnings: 0, status: 'Active' },
  { id: 'USR-003', email: 'alice.w@example.com', name: 'Alice W.', coins: 350, joined: '2024-08-22', warnings: 1, status: 'Active' },
  { id: 'USR-004', email: 'robert.taylor@example.com', name: 'Robert Taylor', coins: 85, joined: '2025-01-30', warnings: 0, status: 'Active' },
];

export interface SiteSettings {
  deliveryFee: number;
  freeShippingThreshold: number;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  socialInstagram: string;
  socialFacebook: string;
  socialTwitter: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  deliveryFee: 150,
  freeShippingThreshold: 5000,
  storeEmail: 'HELLO@AABNOOR.COM',
  storePhone: '+92 (21) 111 287 233',
  storeAddress: 'Aabnoor Flagship Store, Ground Floor, Dolmen Mall Clifton, Karachi, Pakistan',
  socialInstagram: '#',
  socialFacebook: '#',
  socialTwitter: '#',
};

const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'C-001',
    code: 'WELCOME10',
    discountPercentage: 10,
    startDate: '2025-11-01',
    endDate: '2027-12-31',
    usageLimit: 500,
    usageCount: 48,
    minOrderAmount: 1200,
    isActive: true
  },
  {
    id: 'C-002',
    code: 'GLOW25',
    discountPercentage: 25,
    startDate: '2026-01-01',
    endDate: '2027-06-30',
    usageLimit: 100,
    usageCount: 34,
    minOrderAmount: 3000,
    isActive: true
  }
];

interface SiteContextType {
  siteName: string;
  setSiteName: (name: string) => void;
  bannerText: string;
  setBannerText: (text: string) => void;
  isBannerActive: boolean;
  setIsBannerActive: (active: boolean) => void;
  couponCode: string;
  setCouponCode: (code: string) => void;
  couponDiscount: number;
  setCouponDiscount: (discount: number) => void;
  coupons: Coupon[];
  addCoupon: (coupon: Coupon) => void;
  updateCoupon: (id: string, coupon: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  settings: SiteSettings;
  updateSettings: (settings: Partial<SiteSettings>) => void;
  currentUser: string | null;
  setCurrentUser: (email: string | null) => void;
  loginDiscountUsed: boolean;
  setLoginDiscountUsed: (used: boolean) => void;
  categories: string[];
  addCategory: (cat: string) => void;
  removeCategory: (cat: string) => void;
  subCategories: Record<string, string[]>;
  addSubCategory: (category: string, sub: string) => void;
  removeSubCategory: (category: string, sub: string) => void;
  users: UserAccount[];
  deleteUser: (id: string) => void;
  updateUser: (id: string, updates: Partial<UserAccount>) => void;
  warnUser: (id: string) => void;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [siteName, setSiteNameState] = useState(() => {
    const saved = localStorage.getItem('aura_sitename');
    if (!saved || saved === 'Aura') {
      return 'Aabnoor';
    }
    return saved;
  });

  const [categories, setCategoriesState] = useState<string[]>(() => {
    const defaultCats = ['Skin Care', 'Makeup', 'Hair Care', 'Fragrance'];
    const saved = localStorage.getItem('aura_categories');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.includes('Skincare')) {
                return defaultCats; // Reset legacy mismatch
            }
            return parsed;
        } catch (e) {
            return defaultCats;
        }
    }
    return defaultCats;
  });

  const [subCategories, setSubCategoriesState] = useState<Record<string, string[]>>(() => {
    const defaultSubs: Record<string, string[]> = {
      'Skin Care': ['Serums & Essentials', 'Cleansers', 'Night Creams'],
      'Makeup': ['Lip Care & Rouge', 'Mascara & Eyes', 'Setting Powders'],
      'Hair Care': ['Treatment Oils', 'Shampoos', 'Conditioners'],
      'Fragrance': ['Parfums', 'Colognes']
    };
    const saved = localStorage.getItem('aura_subcategories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return defaultSubs;
      }
    }
    return defaultSubs;
  });

  const [users, setUsersState] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('aura_users');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });

  const [bannerText, setBannerTextState] = useState(() => {
    return localStorage.getItem('aura_banner_text') || 'Use code WELCOME10 for 10% off your first order';
  });

  const [isBannerActive, setIsBannerActiveState] = useState(() => {
    const saved = localStorage.getItem('aura_banner_active');
    return saved ? JSON.parse(saved) : true;
  });

  const [couponCode, setCouponCodeState] = useState(() => {
    return localStorage.getItem('aura_coupon_code') || 'WELCOME10';
  });

  const [couponDiscount, setCouponDiscountState] = useState(() => {
    const saved = localStorage.getItem('aura_coupon_discount');
    return saved ? JSON.parse(saved) : 10;
  });

  const [currentUser, setCurrentUserState] = useState<string | null>(() => {
    return localStorage.getItem('aura_current_user') || null;
  });

  const [loginDiscountUsed, setLoginDiscountUsedState] = useState(() => {
    const saved = localStorage.getItem('aura_login_discount_used');
    return saved ? JSON.parse(saved) : false;
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem('aura_coupons');
    return saved ? JSON.parse(saved) : DEFAULT_COUPONS;
  });

  const [settings, setSettingsState] = useState<SiteSettings>(() => {
    const saved = localStorage.getItem('aura_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const setSiteName = (name: string) => {
    setSiteNameState(name);
    localStorage.setItem('aura_sitename', name);
  };

  const setBannerText = (name: string) => {
    setBannerTextState(name);
    localStorage.setItem('aura_banner_text', name);
  };

  const setIsBannerActive = (active: boolean) => {
    setIsBannerActiveState(active);
    localStorage.setItem('aura_banner_active', JSON.stringify(active));
  };

  const setCouponCode = (code: string) => {
    setCouponCodeState(code);
    localStorage.setItem('aura_coupon_code', code);
  };

  const setCouponDiscount = (discount: number) => {
    setCouponDiscountState(discount);
    localStorage.setItem('aura_coupon_discount', JSON.stringify(discount));
  };

  const setCurrentUser = (email: string | null) => {
    setCurrentUserState(email);
    if (email) {
      localStorage.setItem('aura_current_user', email);
    } else {
      localStorage.removeItem('aura_current_user');
    }
  };

  const addCoupon = (coupon: Coupon) => {
    setCoupons(prev => {
      const next = [...prev, coupon];
      localStorage.setItem('aura_coupons', JSON.stringify(next));
      return next;
    });
  };

  const updateCoupon = (id: string, updates: Partial<Coupon>) => {
    setCoupons(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      localStorage.setItem('aura_coupons', JSON.stringify(next));
      return next;
    });
  };

  const deleteCoupon = (id: string) => {
    setCoupons(prev => {
      const next = prev.filter(c => c.id !== id);
      localStorage.setItem('aura_coupons', JSON.stringify(next));
      return next;
    });
  };

  const updateSettings = (updates: Partial<SiteSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('aura_settings', JSON.stringify(next));
      return next;
    });
  };

  const setLoginDiscountUsed = (used: boolean) => {
    setLoginDiscountUsedState(used);
    localStorage.setItem('aura_login_discount_used', JSON.stringify(used));
  };

  const addCategory = (cat: string) => {
    setCategoriesState(prev => {
      if (prev.includes(cat)) return prev;
      const next = [...prev, cat];
      localStorage.setItem('aura_categories', JSON.stringify(next));
      
      // Initialize subcategories array for the new category
      setSubCategoriesState(prevSubs => {
        const nextSubs = { ...prevSubs, [cat]: [] };
        localStorage.setItem('aura_subcategories', JSON.stringify(nextSubs));
        return nextSubs;
      });

      return next;
    });
  };

  const removeCategory = (cat: string) => {
    setCategoriesState(prev => {
      const next = prev.filter(c => c !== cat);
      localStorage.setItem('aura_categories', JSON.stringify(next));
      return next;
    });
    // Clean up subcategories for that category
    setSubCategoriesState(prevSubs => {
      const nextSubs = { ...prevSubs };
      delete nextSubs[cat];
      localStorage.setItem('aura_subcategories', JSON.stringify(nextSubs));
      return nextSubs;
    });
  };

  const addSubCategory = (category: string, sub: string) => {
    setSubCategoriesState(prev => {
      const currentList = prev[category] || [];
      if (currentList.includes(sub)) return prev;
      const next = { ...prev, [category]: [...currentList, sub] };
      localStorage.setItem('aura_subcategories', JSON.stringify(next));
      return next;
    });
  };

  const removeSubCategory = (category: string, sub: string) => {
    setSubCategoriesState(prev => {
      const currentList = prev[category] || [];
      const next = { ...prev, [category]: currentList.filter(s => s !== sub) };
      localStorage.setItem('aura_subcategories', JSON.stringify(next));
      return next;
    });
  };

  const deleteUser = (id: string) => {
    setUsersState(prev => {
      const next = prev.filter(u => u.id !== id);
      localStorage.setItem('aura_users', JSON.stringify(next));
      return next;
    });
  };

  const updateUser = (id: string, updates: Partial<UserAccount>) => {
    setUsersState(prev => {
      const next = prev.map(u => (u.id === id ? { ...u, ...updates } : u));
      localStorage.setItem('aura_users', JSON.stringify(next));
      return next;
    });
  };

  const warnUser = (id: string) => {
    setUsersState(prev => {
      const next = prev.map(u => (u.id === id ? { ...u, warnings: (u.warnings || 0) + 1 } : u));
      localStorage.setItem('aura_users', JSON.stringify(next));
      return next;
    });
  };

  return (
    <SiteContext.Provider value={{ 
      siteName, setSiteName, bannerText, setBannerText, isBannerActive, setIsBannerActive, 
      couponCode, setCouponCode, couponDiscount, setCouponDiscount, 
      coupons, addCoupon, updateCoupon, deleteCoupon,
      settings, updateSettings,
      currentUser, setCurrentUser, loginDiscountUsed, setLoginDiscountUsed, 
      categories, addCategory, removeCategory,
      subCategories, addSubCategory, removeSubCategory,
      users, deleteUser, updateUser, warnUser 
    }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
}
