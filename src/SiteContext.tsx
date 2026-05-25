import React, { createContext, useContext, useState, ReactNode } from 'react';

import { Coupon } from './types';
import { deleteEntity, getStoreValue, seedEntitiesIfEmpty, setStoreValue, upsertEntity } from './lib/storeApi';
import { supabase } from './lib/supabase';

const ADMIN_EMAIL = 'junaidmushtaq988@gmail.com';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  coins: number;
  joined: string;
  warnings: number;
  status?: 'Active' | 'Blocked';
}

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

function readStoredJson<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;

  try {
    return JSON.parse(saved);
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

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
  authUserId: string | null;
  isAuthLoading: boolean;
  isAdmin: boolean;
  refreshAdminStatus: () => Promise<boolean>;
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
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
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
    return [];
  });

  const [bannerText, setBannerTextState] = useState(() => {
    return localStorage.getItem('aura_banner_text') || 'Use code WELCOME10 for 10% off your first order';
  });

  const [isBannerActive, setIsBannerActiveState] = useState(() => {
    return readStoredJson('aura_banner_active', true);
  });

  const [couponCode, setCouponCodeState] = useState(() => {
    return localStorage.getItem('aura_coupon_code') || 'WELCOME10';
  });

  const [couponDiscount, setCouponDiscountState] = useState(() => {
    return readStoredJson('aura_coupon_discount', 10);
  });

  const [currentUser, setCurrentUserState] = useState<string | null>(() => {
    return localStorage.getItem('aura_current_user') || null;
  });

  const [loginDiscountUsed, setLoginDiscountUsedState] = useState(() => {
    return readStoredJson('aura_login_discount_used', false);
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    return readStoredJson('aura_coupons', DEFAULT_COUPONS);
  });

  const [settings, setSettingsState] = useState<SiteSettings>(() => {
    return readStoredJson('aura_settings', DEFAULT_SETTINGS);
  });

  const refreshAdminStatus = React.useCallback(async () => {
    if (!supabase) {
      setIsAdmin(false);
      return false;
    }

    const { data: sessionResult } = await supabase.auth.getSession();
    const user = sessionResult.session?.user;
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
      setIsAdmin(false);
      return false;
    }

    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error || assurance.data.currentLevel !== 'aal2') {
      setIsAdmin(false);
      return false;
    }

    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const nextIsAdmin = Boolean(data && !error);
    setIsAdmin(nextIsAdmin);
    return nextIsAdmin;
  }, []);

  React.useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const user = data.session?.user || null;
      setAuthUserId(user?.id || null);
      setCurrentUserState(user?.email || null);
      if (user?.email) {
        localStorage.setItem('aura_current_user', user.email);
      } else {
        localStorage.removeItem('aura_current_user');
      }
      setIsAuthLoading(false);
      refreshAdminStatus();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setAuthUserId(user?.id || null);
      setCurrentUserState(user?.email || null);
      if (user?.email) {
        localStorage.setItem('aura_current_user', user.email);
      } else {
        localStorage.removeItem('aura_current_user');
      }
      setIsAdmin(false);
      refreshAdminStatus();
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshAdminStatus]);

  React.useEffect(() => {
    let isMounted = true;

    const loadStore = async () => {
      const [
        remoteUsers,
        remoteCoupons,
        remoteSettings,
        remoteCategories,
        remoteSubCategories,
        remoteBannerText,
        remoteBannerActive,
        remoteCouponCode,
        remoteCouponDiscount,
      ] = await Promise.all([
        seedEntitiesIfEmpty<UserAccount>('customers', []),
        seedEntitiesIfEmpty<Coupon>('coupons', DEFAULT_COUPONS),
        getStoreValue<SiteSettings>('settings'),
        getStoreValue<string[]>('categories'),
        getStoreValue<Record<string, string[]>>('subcategories'),
        getStoreValue<string>('banner_text'),
        getStoreValue<boolean>('banner_active'),
        getStoreValue<string>('coupon_code'),
        getStoreValue<number>('coupon_discount'),
      ]);

      if (!isMounted) return;

      if (remoteUsers) {
        setUsersState(remoteUsers);
      }

      if (remoteCoupons) {
        setCoupons(remoteCoupons);
        localStorage.setItem('aura_coupons', JSON.stringify(remoteCoupons));
      }

      if (remoteSettings) {
        setSettingsState(remoteSettings);
        localStorage.setItem('aura_settings', JSON.stringify(remoteSettings));
      } else {
        setStoreValue('settings', DEFAULT_SETTINGS);
      }

      if (remoteCategories) {
        setCategoriesState(remoteCategories);
        localStorage.setItem('aura_categories', JSON.stringify(remoteCategories));
      } else {
        setStoreValue('categories', categories);
      }

      if (remoteSubCategories) {
        setSubCategoriesState(remoteSubCategories);
        localStorage.setItem('aura_subcategories', JSON.stringify(remoteSubCategories));
      } else {
        setStoreValue('subcategories', subCategories);
      }

      if (remoteBannerText !== null) {
        setBannerTextState(remoteBannerText);
        localStorage.setItem('aura_banner_text', remoteBannerText);
      } else {
        setStoreValue('banner_text', bannerText);
      }

      if (remoteBannerActive !== null) {
        setIsBannerActiveState(remoteBannerActive);
        localStorage.setItem('aura_banner_active', JSON.stringify(remoteBannerActive));
      } else {
        setStoreValue('banner_active', isBannerActive);
      }

      if (remoteCouponCode !== null) {
        setCouponCodeState(remoteCouponCode);
        localStorage.setItem('aura_coupon_code', remoteCouponCode);
      } else {
        setStoreValue('coupon_code', couponCode);
      }

      if (remoteCouponDiscount !== null) {
        setCouponDiscountState(remoteCouponDiscount);
        localStorage.setItem('aura_coupon_discount', JSON.stringify(remoteCouponDiscount));
      } else {
        setStoreValue('coupon_discount', couponDiscount);
      }
    };

    loadStore();

    return () => {
      isMounted = false;
    };
  }, []);

  const setSiteName = (name: string) => {
    setSiteNameState(name);
    localStorage.setItem('aura_sitename', name);
    setStoreValue('site_name', name);
  };

  const setBannerText = (name: string) => {
    setBannerTextState(name);
    localStorage.setItem('aura_banner_text', name);
    setStoreValue('banner_text', name);
  };

  const setIsBannerActive = (active: boolean) => {
    setIsBannerActiveState(active);
    localStorage.setItem('aura_banner_active', JSON.stringify(active));
    setStoreValue('banner_active', active);
  };

  const setCouponCode = (code: string) => {
    setCouponCodeState(code);
    localStorage.setItem('aura_coupon_code', code);
    setStoreValue('coupon_code', code);
  };

  const setCouponDiscount = (discount: number) => {
    setCouponDiscountState(discount);
    localStorage.setItem('aura_coupon_discount', JSON.stringify(discount));
    setStoreValue('coupon_discount', discount);
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
      upsertEntity('coupons', coupon);
      return next;
    });
  };

  const updateCoupon = (id: string, updates: Partial<Coupon>) => {
    setCoupons(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      localStorage.setItem('aura_coupons', JSON.stringify(next));
      const updated = next.find(coupon => coupon.id === id);
      if (updated) upsertEntity('coupons', updated);
      return next;
    });
  };

  const deleteCoupon = (id: string) => {
    setCoupons(prev => {
      const next = prev.filter(c => c.id !== id);
      localStorage.setItem('aura_coupons', JSON.stringify(next));
      deleteEntity('coupons', id);
      return next;
    });
  };

  const updateSettings = (updates: Partial<SiteSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('aura_settings', JSON.stringify(next));
      setStoreValue('settings', next);
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
      setStoreValue('categories', next);
      
      // Initialize subcategories array for the new category
      setSubCategoriesState(prevSubs => {
        const nextSubs = { ...prevSubs, [cat]: [] };
        localStorage.setItem('aura_subcategories', JSON.stringify(nextSubs));
        setStoreValue('subcategories', nextSubs);
        return nextSubs;
      });

      return next;
    });
  };

  const removeCategory = (cat: string) => {
    setCategoriesState(prev => {
      const next = prev.filter(c => c !== cat);
      localStorage.setItem('aura_categories', JSON.stringify(next));
      setStoreValue('categories', next);
      return next;
    });
    // Clean up subcategories for that category
    setSubCategoriesState(prevSubs => {
      const nextSubs = { ...prevSubs };
      delete nextSubs[cat];
      localStorage.setItem('aura_subcategories', JSON.stringify(nextSubs));
      setStoreValue('subcategories', nextSubs);
      return nextSubs;
    });
  };

  const addSubCategory = (category: string, sub: string) => {
    setSubCategoriesState(prev => {
      const currentList = prev[category] || [];
      if (currentList.includes(sub)) return prev;
      const next = { ...prev, [category]: [...currentList, sub] };
      localStorage.setItem('aura_subcategories', JSON.stringify(next));
      setStoreValue('subcategories', next);
      return next;
    });
  };

  const removeSubCategory = (category: string, sub: string) => {
    setSubCategoriesState(prev => {
      const currentList = prev[category] || [];
      const next = { ...prev, [category]: currentList.filter(s => s !== sub) };
      localStorage.setItem('aura_subcategories', JSON.stringify(next));
      setStoreValue('subcategories', next);
      return next;
    });
  };

  const deleteUser = (id: string) => {
    setUsersState(prev => {
      const next = prev.filter(u => u.id !== id);
      deleteEntity('customers', id);
      return next;
    });
  };

  const updateUser = (id: string, updates: Partial<UserAccount>) => {
    setUsersState(prev => {
      const next = prev.map(u => (u.id === id ? { ...u, ...updates } : u));
      const updated = next.find(user => user.id === id);
      if (updated) upsertEntity('customers', updated);
      return next;
    });
  };

  const warnUser = (id: string) => {
    setUsersState(prev => {
      const next = prev.map(u => (u.id === id ? { ...u, warnings: (u.warnings || 0) + 1 } : u));
      const updated = next.find(user => user.id === id);
      if (updated) upsertEntity('customers', updated);
      return next;
    });
  };

  return (
    <SiteContext.Provider value={{ 
      siteName, setSiteName, bannerText, setBannerText, isBannerActive, setIsBannerActive, 
      couponCode, setCouponCode, couponDiscount, setCouponDiscount, 
      coupons, addCoupon, updateCoupon, deleteCoupon,
      settings, updateSettings,
      currentUser, setCurrentUser, authUserId, isAuthLoading, isAdmin, refreshAdminStatus, loginDiscountUsed, setLoginDiscountUsed, 
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
