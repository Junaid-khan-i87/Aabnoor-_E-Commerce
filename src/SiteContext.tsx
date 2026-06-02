import React, { createContext, useContext, useState, ReactNode } from 'react';

import { deleteEntity, getStoreValue, listEntities, setStoreValue, upsertEntity } from './lib/storeApi';
import { supabase } from './lib/supabase';
import { FREE_SHIPPING_THRESHOLD } from './config';

export const SUPPORT_EMAIL = 'support@aabnoor.shop';

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
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  liveSaleActive: boolean;
  liveSaleTitle: string;
  liveSaleSubtitle: string;
  liveSaleDiscountText: string;
  liveSaleEndTime: string;
  socialInstagram: string;
  socialFacebook: string;
  socialTwitter: string;
}

const getDefaultLiveSaleEndTime = () => new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString();

const DEFAULT_SETTINGS: SiteSettings = {
  deliveryFee: 150,
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  storeEmail: 'support@aabnoor.shop',
  storePhone: '+92 (21) 111 287 233',
  storeAddress: 'Aabnoor Flagship Store, Ground Floor, Dolmen Mall Clifton, Karachi, Pakistan',
  heroEyebrow: 'The Future of Beauty',
  heroTitle: 'Redefine Your Beauty Routine',
  heroSubtitle: 'Curated skincare, makeup, hair care, and fragrance essentials designed for modern beauty.',
  heroImageUrl: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=2400&auto=format&fit=crop',
  liveSaleActive: true,
  liveSaleTitle: 'Midnight Bloom Flash Series',
  liveSaleSubtitle: 'Bespoke dermal oils, hydrating essences and targeted peptide serums temporarily scaled down in values.',
  liveSaleDiscountText: 'up to 40% off',
  liveSaleEndTime: getDefaultLiveSaleEndTime(),
  socialInstagram: '#',
  socialFacebook: '#',
  socialTwitter: '#',
};

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

const syncCustomerProfile = async (user: { id: string; email?: string | null; user_metadata?: Record<string, any> }) => {
  if (!supabase || !user.email) return;

  const email = user.email.toLowerCase();
  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.display_name ||
    email.split('@')[0];

  const customerId = `USR-${user.id}`;
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('id', customerId)
    .maybeSingle();

  if (existingCustomer) return;

  await supabase.from('customers').insert({
    id: customerId,
    data: {
      id: customerId,
      email,
      name,
      coins: 0,
      joined: new Date().toISOString().slice(0, 10),
      warnings: 0,
      status: 'Active',
    },
  });
};

export function SiteProvider({ children }: { children: ReactNode }) {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [siteName, setSiteNameState] = useState('Aabnoor');

  const [categories, setCategoriesState] = useState<string[]>([]);

  const [subCategories, setSubCategoriesState] = useState<Record<string, string[]>>({});

  const [users, setUsersState] = useState<UserAccount[]>(() => {
    return [];
  });

  const [bannerText, setBannerTextState] = useState('');

  const [isBannerActive, setIsBannerActiveState] = useState(false);

  const [couponCode, setCouponCodeState] = useState('');

  const [couponDiscount, setCouponDiscountState] = useState(0);

  const [currentUser, setCurrentUserState] = useState<string | null>(() => {
    return localStorage.getItem('aura_current_user') || null;
  });

  const [loginDiscountUsed, setLoginDiscountUsedState] = useState(false);

  const [settings, setSettingsState] = useState<SiteSettings>(DEFAULT_SETTINGS);

  const refreshAdminStatus = React.useCallback(async () => {
    if (!supabase) {
      setIsAdmin(false);
      return false;
    }

    const { data: sessionResult } = await supabase.auth.getSession();
    const token = sessionResult.session?.access_token;
    if (!token) {
      setIsAdmin(false);
      return false;
    }

    const response = await fetch('/api/admin-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      setIsAdmin(false);
      return false;
    }

    const result = await response.json().catch(() => null);
    const nextIsAdmin = Boolean(result?.isAdmin);
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
        syncCustomerProfile(user);
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
        syncCustomerProfile(user);
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
        remoteSiteName,
        remoteSettings,
        remoteCategories,
        remoteSubCategories,
        remoteBannerText,
        remoteBannerActive,
        remoteCouponCode,
        remoteCouponDiscount,
      ] = await Promise.all([
        listEntities<UserAccount>('customers'),
        getStoreValue<string>('site_name'),
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

      if (remoteSiteName) {
        setSiteNameState(remoteSiteName);
      }

      if (remoteSettings) {
        const savedEmail = String(remoteSettings.storeEmail || '').trim().toLowerCase();
        const shouldReplacePlaceholderEmail = ['hello@aabnoor.com', 'contact@aabnoor.com'].includes(savedEmail);
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...remoteSettings,
          storeEmail: shouldReplacePlaceholderEmail ? SUPPORT_EMAIL : remoteSettings.storeEmail || SUPPORT_EMAIL,
        };
        setSettingsState(mergedSettings);
        if (!remoteSettings.liveSaleEndTime || shouldReplacePlaceholderEmail) {
          setStoreValue('settings', mergedSettings);
        }
      } else {
        setStoreValue('settings', DEFAULT_SETTINGS);
      }

      if (remoteCategories) {
        setCategoriesState(remoteCategories);
      } else {
        setStoreValue('categories', []);
      }

      if (remoteSubCategories) {
        setSubCategoriesState(remoteSubCategories);
      } else {
        setStoreValue('subcategories', {});
      }

      if (remoteBannerText !== null) {
        setBannerTextState(remoteBannerText);
      } else {
        setStoreValue('banner_text', '');
      }

      if (remoteBannerActive !== null) {
        setIsBannerActiveState(remoteBannerActive);
      } else {
        setStoreValue('banner_active', false);
      }

      if (remoteCouponCode !== null) {
        setCouponCodeState(remoteCouponCode);
      } else {
        setStoreValue('coupon_code', '');
      }

      if (remoteCouponDiscount !== null) {
        setCouponDiscountState(remoteCouponDiscount);
      } else {
        setStoreValue('coupon_discount', 0);
      }
    };

    loadStore();

    return () => {
      isMounted = false;
    };
  }, []);

  const setSiteName = (name: string) => {
    setSiteNameState(name);
    setStoreValue('site_name', name);
  };

  const setBannerText = (name: string) => {
    setBannerTextState(name);
    setStoreValue('banner_text', name);
  };

  const setIsBannerActive = (active: boolean) => {
    setIsBannerActiveState(active);
    setStoreValue('banner_active', active);
  };

  const setCouponCode = (code: string) => {
    setCouponCodeState(code);
    setStoreValue('coupon_code', code);
  };

  const setCouponDiscount = (discount: number) => {
    setCouponDiscountState(discount);
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

  const updateSettings = (updates: Partial<SiteSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...updates };
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
      setStoreValue('categories', next);
      
      // Initialize subcategories array for the new category
      setSubCategoriesState(prevSubs => {
        const nextSubs = { ...prevSubs, [cat]: [] };
        setStoreValue('subcategories', nextSubs);
        return nextSubs;
      });

      return next;
    });
  };

  const removeCategory = (cat: string) => {
    setCategoriesState(prev => {
      const next = prev.filter(c => c !== cat);
      setStoreValue('categories', next);
      return next;
    });
    // Clean up subcategories for that category
    setSubCategoriesState(prevSubs => {
      const nextSubs = { ...prevSubs };
      delete nextSubs[cat];
      setStoreValue('subcategories', nextSubs);
      return nextSubs;
    });
  };

  const addSubCategory = (category: string, sub: string) => {
    setSubCategoriesState(prev => {
      const currentList = prev[category] || [];
      if (currentList.includes(sub)) return prev;
      const next = { ...prev, [category]: [...currentList, sub] };
      setStoreValue('subcategories', next);
      return next;
    });
  };

  const removeSubCategory = (category: string, sub: string) => {
    setSubCategoriesState(prev => {
      const currentList = prev[category] || [];
      const next = { ...prev, [category]: currentList.filter(s => s !== sub) };
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
