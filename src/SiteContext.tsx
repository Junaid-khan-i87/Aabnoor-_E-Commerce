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
  themePrimary: string;
  themeBackground: string;
  themeText: string;
  themeMuted: string;
  themeAccent: string;
  deliveryFee: number;
  freeShippingThreshold: number;
  storeName: string;
  logoUrl: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  supportEmail: string;
  supportPhone: string;
  websiteUrl: string;
  businessAddress: string;
  returnAddress: string;
  ntn: string;
  strn: string;
  taxEnabled: boolean;
  defaultReturnPolicy: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  heroPrimaryCtaLabel: string;
  heroPrimaryCtaUrl: string;
  heroSecondaryCtaLabel: string;
  heroSecondaryCtaUrl: string;
  homeSeoTitle: string;
  homeSeoDescription: string;
  showHomeHero: boolean;
  showHomeMarquee: boolean;
  showHomeSmartSearch: boolean;
  showHomeTrustBadges: boolean;
  showHomeCategories: boolean;
  showHomeBestSellers: boolean;
  showHomeLiveSalePromo: boolean;
  showHomeBenefits: boolean;
  showHomeSeoContent: boolean;
  showHomeProductGrid: boolean;
  showHomeReviews: boolean;
  enableAnnouncementBar: boolean;
  announcementMessages: string[];
  enableHeaderSearch: boolean;
  enableWishlistFeature: boolean;
  enableLoyaltyWidget: boolean;
  enableMobileBottomNav: boolean;
  enableWhatsApp: boolean;
  enableCoupons: boolean;
  enableExpressDelivery: boolean;
  maintenanceMode: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  maintenanceEta: string;
  promoPopupEnabled: boolean;
  promoPopupTitle: string;
  promoPopupBody: string;
  promoPopupCode: string;
  promoPopupCtaLabel: string;
  promoPopupCtaUrl: string;
  whatsappMessage: string;
  checkoutNotice: string;
  standardDeliveryLabel: string;
  standardDeliveryWindow: string;
  expressDeliveryLabel: string;
  expressDeliveryWindow: string;
  codPaymentLabel: string;
  orderButtonLabel: string;
  footerTagline: string;
  showFooterNewsletter: boolean;
  privacyPageContent: string;
  termsPageContent: string;
  shippingPageContent: string;
  contactPageContent: string;
  faqPageContent: string;
  storyPageContent: string;
  sustainabilityPageContent: string;
  ingredientsPageContent: string;
  journalPageContent: string;
  trustBadgeSecureTitle: string;
  trustBadgeSecureText: string;
  trustBadgeDeliveryTitle: string;
  trustBadgeDeliveryText: string;
  trustBadgeTrackingTitle: string;
  trustBadgeTrackingText: string;
  trustBadgeOffersTitle: string;
  trustBadgeOffersText: string;
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
  themePrimary: '#C97A82',
  themeBackground: '#FAF6F0',
  themeText: '#2D2426',
  themeMuted: '#8A7070',
  themeAccent: '#B8895A',
  deliveryFee: 150,
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  storeName: 'Aabnoor Beauty',
  logoUrl: '',
  storeEmail: 'support@aabnoor.shop',
  storePhone: '+92 (21) 111 287 233',
  storeAddress: 'Aabnoor Flagship Store, Ground Floor, Dolmen Mall Clifton, Karachi, Pakistan',
  supportEmail: 'support@aabnoor.shop',
  supportPhone: '+92 (21) 111 287 233',
  websiteUrl: 'https://aabnoor.shop',
  businessAddress: 'Aabnoor Flagship Store, Ground Floor, Dolmen Mall Clifton, Karachi, Pakistan',
  returnAddress: 'Aabnoor Returns Desk, Ground Floor, Dolmen Mall Clifton, Karachi, Pakistan',
  ntn: '',
  strn: '',
  taxEnabled: false,
  defaultReturnPolicy: 'Beauty and personal care items can be returned only when unopened, unused, and reported within 7 days of delivery.',
  heroEyebrow: 'New Collection',
  heroTitle: 'Discover Your Glow',
  heroSubtitle: 'Premium beauty essentials, curated for you with secure checkout, Cash on Delivery, and trackable orders.',
  heroImageUrl: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=2400&auto=format&fit=crop',
  heroPrimaryCtaLabel: 'Shop Now',
  heroPrimaryCtaUrl: '/shop',
  heroSecondaryCtaLabel: 'Shop Best Sellers',
  heroSecondaryCtaUrl: '/shop',
  homeSeoTitle: 'Aabnoor Beauty | Premium Beauty & Skincare',
  homeSeoDescription: 'Shop Aabnoor Beauty for premium skincare, makeup, hair care, fragrance, live sale offers, secure checkout and order tracking.',
  showHomeHero: true,
  showHomeMarquee: true,
  showHomeSmartSearch: true,
  showHomeTrustBadges: true,
  showHomeCategories: true,
  showHomeBestSellers: true,
  showHomeLiveSalePromo: true,
  showHomeBenefits: true,
  showHomeSeoContent: true,
  showHomeProductGrid: true,
  showHomeReviews: true,
  enableAnnouncementBar: true,
  announcementMessages: [
    'Free shipping over Rs. 9999',
    'Cash on Delivery available',
    '10% off your first order',
    'Track every order after checkout',
  ],
  enableHeaderSearch: true,
  enableWishlistFeature: true,
  enableLoyaltyWidget: true,
  enableMobileBottomNav: true,
  enableWhatsApp: true,
  enableCoupons: true,
  enableExpressDelivery: true,
  maintenanceMode: false,
  maintenanceTitle: 'Aabnoor Beauty is getting polished',
  maintenanceMessage: 'We are updating the store experience. Please check back shortly or contact support for urgent orders.',
  maintenanceEta: 'Back soon',
  promoPopupEnabled: false,
  promoPopupTitle: 'Glow offer unlocked',
  promoPopupBody: 'Use today\'s beauty offer before checkout. Limited-time savings are applied by coupon code.',
  promoPopupCode: 'AABNOOR10',
  promoPopupCtaLabel: 'Shop Offer',
  promoPopupCtaUrl: '/shop',
  whatsappMessage: 'Hi Aabnoor Beauty, I need help with my order.',
  checkoutNotice: 'Cash on Delivery orders are confirmed by phone before dispatch. Please enter an active contact number.',
  standardDeliveryLabel: 'Standard Delivery',
  standardDeliveryWindow: '3-5 business days',
  expressDeliveryLabel: 'Express Delivery',
  expressDeliveryWindow: '1-2 business days',
  codPaymentLabel: 'Cash on Delivery',
  orderButtonLabel: 'Confirm COD Order',
  footerTagline: 'Premium skincare, makeup, hair care and fragrance with secure checkout, clear delivery tracking and local payment support.',
  showFooterNewsletter: true,
  privacyPageContent: '',
  termsPageContent: '',
  shippingPageContent: '',
  contactPageContent: '',
  faqPageContent: '',
  storyPageContent: '',
  sustainabilityPageContent: '',
  ingredientsPageContent: '',
  journalPageContent: '',
  trustBadgeSecureTitle: 'Secure Checkout',
  trustBadgeSecureText: 'Protected login and verified order flow.',
  trustBadgeDeliveryTitle: 'Fast Delivery',
  trustBadgeDeliveryText: 'Free shipping over Rs. {threshold}.',
  trustBadgeTrackingTitle: 'Order Tracking',
  trustBadgeTrackingText: 'Tracking number is saved and emailed.',
  trustBadgeOffersTitle: 'Fresh Offers',
  trustBadgeOffersText: '{count} active flash deal{plural}.',
  liveSaleActive: true,
  liveSaleTitle: 'Midnight Bloom Flash Series',
  liveSaleSubtitle: 'Limited beauty offers with clear pricing, Cash on Delivery, and order tracking.',
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
        const shouldReplaceOldHero =
          remoteSettings.heroTitle === 'Redefine Your Beauty Routine' &&
          remoteSettings.heroSubtitle === 'Curated skincare, makeup, hair care, and fragrance essentials designed for modern beauty.';
        const removedFeatureParts = ['skin', 'quiz'];
        const removedFeatureTitleParts = removedFeatureParts.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`);
        const removedFeaturePath = `/${removedFeatureParts.join('-')}`;
        const removedFeatureLabel = ['Take', ...removedFeatureTitleParts].join(' ');
        const removedFeatureFlag = ['enable', ...removedFeatureTitleParts].join('');
        const remoteSettingsRecord = remoteSettings as SiteSettings & Record<string, unknown>;
        const { [removedFeatureFlag]: _removedFeatureFlag, ...remoteSettingsWithoutQuiz } = remoteSettingsRecord;
        const shouldReplaceRemovedFeatureCta = remoteSettings.heroSecondaryCtaUrl === removedFeaturePath;
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...remoteSettingsWithoutQuiz,
          storeEmail: shouldReplacePlaceholderEmail ? SUPPORT_EMAIL : remoteSettingsWithoutQuiz.storeEmail || SUPPORT_EMAIL,
          heroEyebrow: shouldReplaceOldHero ? DEFAULT_SETTINGS.heroEyebrow : remoteSettingsWithoutQuiz.heroEyebrow || DEFAULT_SETTINGS.heroEyebrow,
          heroTitle: shouldReplaceOldHero ? DEFAULT_SETTINGS.heroTitle : remoteSettingsWithoutQuiz.heroTitle || DEFAULT_SETTINGS.heroTitle,
          heroSubtitle: shouldReplaceOldHero ? DEFAULT_SETTINGS.heroSubtitle : remoteSettingsWithoutQuiz.heroSubtitle || DEFAULT_SETTINGS.heroSubtitle,
          heroSecondaryCtaLabel: shouldReplaceRemovedFeatureCta || remoteSettings.heroSecondaryCtaLabel === removedFeatureLabel ? DEFAULT_SETTINGS.heroSecondaryCtaLabel : remoteSettingsWithoutQuiz.heroSecondaryCtaLabel || DEFAULT_SETTINGS.heroSecondaryCtaLabel,
          heroSecondaryCtaUrl: shouldReplaceRemovedFeatureCta ? DEFAULT_SETTINGS.heroSecondaryCtaUrl : remoteSettingsWithoutQuiz.heroSecondaryCtaUrl || DEFAULT_SETTINGS.heroSecondaryCtaUrl,
        };
        setSettingsState(mergedSettings);
        if (!remoteSettings.liveSaleEndTime || shouldReplacePlaceholderEmail || shouldReplaceOldHero || shouldReplaceRemovedFeatureCta || removedFeatureFlag in remoteSettings) {
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
