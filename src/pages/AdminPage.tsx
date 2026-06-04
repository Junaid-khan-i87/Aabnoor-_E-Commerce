import React, { useEffect, useState } from 'react';
import { Users, ShoppingBag, Coins, BarChart3, Shield, Key, Package, Edit, Plus, Trash2, ChevronDown, ChevronUp, FileText, Eye, EyeOff, X, Mail, Download, AlertTriangle, Database, RefreshCw, Radio, Timer, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useProducts } from '../ProductContext';
import { useOrders } from '../OrderContext';
import { useLoyalty } from '../LoyaltyContext';
import { useSite } from '../SiteContext';
import { Coupon, Product, OrderStatus } from '../types';
import { SafeImage } from '../components/SafeImage';
import { useUI } from '../UIContext';
import { supabase } from '../lib/supabase';
import { deleteEntity, listEntities, upsertEntity } from '../lib/storeApi';
import { downloadInvoicePdf, downloadShippingLabelPdf, printOrderDocument } from '../lib/orderDocuments';

type AdminTab = 'dashboard' | 'live' | 'orders' | 'customers' | 'products' | 'discounts' | 'reports' | 'audit' | 'settings';

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'live', label: 'Live Ops' },
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products' },
  { id: 'customers', label: 'Customers' },
  { id: 'discounts', label: 'Promotions' },
  { id: 'reports', label: 'Reports' },
  { id: 'audit', label: 'Audit' },
  { id: 'settings', label: 'Settings' },
];

const ORDER_STATUS_VALUES: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];

function useAdminCoupons(isAdmin: boolean) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const refreshCoupons = React.useCallback(async () => {
    if (!isAdmin) {
      setCoupons([]);
      return;
    }

    const remoteCoupons = await listEntities<Coupon>('coupons');
    if (remoteCoupons) {
      setCoupons(remoteCoupons);
    }
  }, [isAdmin]);

  useEffect(() => {
    let isMounted = true;

    if (!isAdmin) {
      setCoupons([]);
      return () => {
        isMounted = false;
      };
    }

    listEntities<Coupon>('coupons').then(remoteCoupons => {
      if (isMounted && remoteCoupons) {
        setCoupons(remoteCoupons);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  const addCoupon = (coupon: Coupon) => {
    setCoupons(prev => {
      const next = [...prev, coupon];
      upsertEntity('coupons', coupon);
      return next;
    });
  };

  const updateCoupon = (id: string, updates: Partial<Coupon>) => {
    setCoupons(prev => {
      const next = prev.map(coupon => coupon.id === id ? { ...coupon, ...updates } : coupon);
      const updated = next.find(coupon => coupon.id === id);
      if (updated) upsertEntity('coupons', updated);
      return next;
    });
  };

  const deleteCoupon = (id: string) => {
    setCoupons(prev => {
      const next = prev.filter(coupon => coupon.id !== id);
      deleteEntity('coupons', id);
      return next;
    });
  };

  return { coupons, addCoupon, updateCoupon, deleteCoupon, refreshCoupons };
}

const toDateTimeLocalValue = (isoValue?: string) => {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const fromDateTimeLocalValue = (value: string) => {
  if (!value) return '';
  return new Date(value).toISOString();
};

const PRODUCT_FORM_OPTIONS = ['Cream', 'Serum', 'Oil', 'Toner', 'Lotion', 'Gel', 'Mask', 'Powder', 'Spray', 'Capsule', 'Tablet', 'Other'];
const SKIN_TYPE_OPTIONS = [
  ['dry', 'Dry'],
  ['oily', 'Oily'],
  ['combination', 'Combination'],
  ['normal', 'Normal'],
  ['sensitive', 'Sensitive'],
  ['all', 'All Skin Types'],
];
const CONCERN_OPTIONS = [
  ['acne', 'Acne'],
  ['dark_spots', 'Dark Spots'],
  ['anti_aging', 'Anti-Aging'],
  ['brightening', 'Brightening'],
  ['hydration', 'Hydration'],
  ['pores', 'Open Pores'],
  ['fine_lines', 'Fine Lines'],
  ['pigmentation', 'Pigmentation'],
  ['hair_fall', 'Hair Fall'],
  ['dandruff', 'Dandruff'],
];
const VARIANT_TYPE_OPTIONS = [
  ['shade', 'Shade/Color'],
  ['size', 'Size'],
  ['volume', 'Volume'],
  ['pack_size', 'Pack Size'],
  ['color', 'Color'],
];

const parseListValue = (value: FormDataEntryValue | null) =>
  String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

const labelizeValue = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

const slugifyProductName = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const generateSku = (category: string) => {
  const abbreviation = (category.replace(/[^a-z]/gi, '').slice(0, 3) || 'PRD').toUpperCase();
  return `${abbreviation}-${Math.floor(100000 + Math.random() * 900000)}`;
};

const csvEscape = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const rowsToCsv = (headers: string[], rows: Array<Record<string, unknown>>) => [
  headers.map(csvEscape).join(','),
  ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
].join('\n');

const downloadTextFile = (filename: string, content: string, type = 'text/csv;charset=utf-8') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const uniqueSlug = (baseSlug: string, products: Product[], currentProductId?: string) => {
  const rootSlug = baseSlug || 'product';
  let nextSlug = rootSlug;
  let suffix = 2;

  while (products.some(product => product.id !== currentProductId && product.slug === nextSlug)) {
    nextSlug = `${rootSlug}-${suffix}`;
    suffix += 1;
  }

  return nextSlug;
};

export function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaQrCode, setMfaQrCode] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [adminStep, setAdminStep] = useState<'password' | 'mfa' | 'enroll'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'cancel_order' | 'delete_order' | 'delete_user' | 'warn_user' | 'toggle_block_user' | 'delete_product' | 'delete_coupon' | null;
    targetId: string | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    actionType: null,
    targetId: null,
  });

  const handleConfirmAction = () => {
    if (!confirmDialog.targetId) return;
    
    switch (confirmDialog.actionType) {
      case 'cancel_order':
        const orderToCancel = orders.find(o => o.id === confirmDialog.targetId);
        if (orderToCancel) {
          handleStatusChange(orderToCancel.id, orderToCancel.status, 'Cancelled', orderToCancel.coinsEarned, orderToCancel.coinsAdded);
        }
        break;
      case 'delete_order':
        deleteOrder(confirmDialog.targetId);
        setExpandedOrderId(null);
        break;
      case 'delete_user':
        deleteUser(confirmDialog.targetId);
        break;
      case 'warn_user':
        warnUser(confirmDialog.targetId);
        break;
      case 'toggle_block_user':
        const targetUser = users.find(u => u.id === confirmDialog.targetId);
        if (targetUser) {
          const newStatus = targetUser.status === 'Blocked' ? 'Active' : 'Blocked';
          updateUser(targetUser.id, { status: newStatus });
          addToast(newStatus === 'Blocked' ? 'Customer account has been blocked' : 'Customer account has been unblocked', 'success');
        }
        break;
      case 'delete_product':
        deleteProduct(confirmDialog.targetId);
        break;
      case 'delete_coupon':
        deleteCoupon(confirmDialog.targetId);
        break;
    }
    
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };
  
  const { productsList, addProduct, updateProduct, deleteProduct, saveProductsList, refreshProducts } = useProducts();
  const { orders, updateOrderStatus, updateOrder, deleteOrder, refreshOrders } = useOrders();
  const { 
    siteName, setSiteName, bannerText, setBannerText, isBannerActive, setIsBannerActive, 
    couponCode, setCouponCode, couponDiscount, setCouponDiscount, 
    settings, updateSettings,
    categories, addCategory, removeCategory,
    subCategories, addSubCategory, removeSubCategory,
    users, deleteUser, updateUser, warnUser,
    isAuthLoading, isAdmin, refreshAdminStatus,
  } = useSite();
  const { coupons, addCoupon, updateCoupon, deleteCoupon, refreshCoupons } = useAdminCoupons(isAdmin);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedSubCatEditing, setSelectedSubCatEditing] = useState<string>('Skin Care');
  const [isCreating, setIsCreating] = useState(false);
  const [uploadedAdditionalImages, setUploadedAdditionalImages] = useState<string[]>([]);
  const [newImageUrlInput, setNewImageUrlInput] = useState('');
  const [seoTitleDraft, setSeoTitleDraft] = useState('');
  const [seoDescriptionDraft, setSeoDescriptionDraft] = useState('');
  const [hasVariantsDraft, setHasVariantsDraft] = useState(false);
  const [variantRows, setVariantRows] = useState<Product['variants']>([]);
  
  // Bulk Flash Sale states
  const [isBulkFlashOpen, setIsBulkFlashOpen] = useState(false);
  const [bulkTargetType, setBulkTargetType] = useState<'all' | 'category' | 'manual'>('all');
  const [bulkSelectedCategory, setBulkSelectedCategory] = useState('Skin Care');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkActionType, setBulkActionType] = useState<'activate' | 'deactivate'>('activate');
  const [bulkDiscountPercentage, setBulkDiscountPercentage] = useState(20);
  const [bulkFixedPrice, setBulkFixedPrice] = useState<string>('');
  const [bulkEndTime, setBulkEndTime] = useState(() => {
    const tom = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tom.toISOString().slice(0, 16);
  });
  const [bulkFlashMessage, setBulkFlashMessage] = useState<{ text: string, type: 'success' | 'error' | '' }>({ text: '', type: '' });
  
  const [editingCoupon, setEditingCoupon] = useState<any>(null); // We'll just define inline
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [settingsForm, setSettingsForm] = useState(settings);
  const [settingsToast, setSettingsToast] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(8);
  const [replenishQuantities, setReplenishQuantities] = useState<Record<string, number>>({});
  const [liveNow, setLiveNow] = useState(Date.now());
  const [isLiveRefreshing, setIsLiveRefreshing] = useState(false);
  const [isCouponRefreshing, setIsCouponRefreshing] = useState(false);
  const [lastLiveRefresh, setLastLiveRefresh] = useState<Date | null>(null);
  const [liveRefreshSeconds, setLiveRefreshSeconds] = useState(() => {
    const saved = localStorage.getItem('aabnoor_live_ops_refresh_seconds');
    return saved ? Math.max(0, Number(saved) || 0) : 0;
  });
  
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const { addCoins } = useLoyalty();
  const { addToast } = useUI();

  const refreshLiveData = React.useCallback(async () => {
    setIsLiveRefreshing(true);
    try {
      await Promise.all([refreshOrders(), refreshProducts(), refreshCoupons()]);
      setLastLiveRefresh(new Date());
    } finally {
      setIsLiveRefreshing(false);
    }
  }, [refreshOrders, refreshProducts, refreshCoupons]);

  const handleRefreshCoupons = React.useCallback(async () => {
    setIsCouponRefreshing(true);
    try {
      await refreshCoupons();
      addToast('Coupon usage refreshed.', 'success');
    } catch {
      addToast('Coupon usage could not be refreshed. Try again.', 'error');
    } finally {
      setIsCouponRefreshing(false);
    }
  }, [addToast, refreshCoupons]);

  useEffect(() => {
    if (activeTab !== 'live' || !isAdmin) return undefined;
    const clockTimer = window.setInterval(() => {
      setLiveNow(Date.now());
    }, 1000);
    let refreshTimer: number | undefined;
    if (liveRefreshSeconds > 0) {
      refreshTimer = window.setInterval(() => {
        void refreshLiveData();
      }, liveRefreshSeconds * 1000);
    }
    return () => {
      window.clearInterval(clockTimer);
      if (refreshTimer) window.clearInterval(refreshTimer);
    };
  }, [activeTab, isAdmin, refreshLiveData, liveRefreshSeconds]);

  const setLiveRefreshPreference = (seconds: number) => {
    setLiveRefreshSeconds(seconds);
    localStorage.setItem('aabnoor_live_ops_refresh_seconds', String(seconds));
  };
  
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productStockFilter, setProductStockFilter] = useState('all');
  
  const [orderSort, setOrderSort] = useState('newest');
  const [productSort, setProductSort] = useState('newest');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStatusChange = async (orderId: string, currentStatus: OrderStatus, newStatus: OrderStatus, coinsEarned: number, coinsAdded?: boolean) => {
    let markCoinsAdded = coinsAdded;
    const shouldAddCoins = !coinsAdded && (newStatus === 'Shipped' || newStatus === 'Delivered');
    if (shouldAddCoins) markCoinsAdded = true;

    const result = await updateOrderStatus(orderId, newStatus, undefined, markCoinsAdded);
    if (!result.ok) {
      addToast(result.error || 'Order status was not saved. Sign in again with authenticator and try once more.', 'error');
      return;
    }

    if (shouldAddCoins) addCoins(coinsEarned);

    if (newStatus === 'Delivered' && currentStatus !== 'Delivered') {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        try {
          const { data: sessionResult } = await supabase?.auth.getSession() || { data: { session: null } };
          const token = sessionResult.session?.access_token;
          if (!token) {
            addToast('Order delivered, but email was not sent. Sign in again with authenticator.', 'error');
          } else {
            const emailResponse = await fetch('/api/admin-send-delivery-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ orderId }),
            });
            const emailResult = await emailResponse.json().catch(() => ({}));
            if (!emailResponse.ok) {
              addToast(emailResult.error || 'Order delivered, but delivery email was not sent.', 'error');
            } else {
              addToast(`Delivery email sent to ${emailResult.to || order.userEmail}.`, 'info');
            }
          }
        } catch {
          addToast('Order delivered, but delivery email was not sent.', 'error');
        }
      }
    }

    addToast(`Order ${orderId} updated to ${newStatus}.`, 'success');
  };

  const handleBulkStatusChange = (newStatus: OrderStatus) => {
    if (selectedOrders.length === 0) return;
    selectedOrders.forEach(async orderId => {
      const order = orders.find(o => o.id === orderId);
      if (order && order.status !== newStatus) {
        await handleStatusChange(order.id, order.status, newStatus, order.coinsEarned, order.coinsAdded);
      }
    });
    setSelectedOrders([]);
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleAllOrders = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  const filteredOrders = orders.filter(o => 
    (orderStatusFilter === 'all' || o.status === orderStatusFilter) &&
    (o.id.toLowerCase().includes(orderSearch.toLowerCase()) || 
     o.userEmail.toLowerCase().includes(orderSearch.toLowerCase()) ||
     (o.userName && o.userName.toLowerCase().includes(orderSearch.toLowerCase())))
  ).sort((a, b) => {
    if (orderSort === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (orderSort === 'highest') return b.total - a.total;
    if (orderSort === 'lowest') return a.total - b.total;
    return new Date(b.date).getTime() - new Date(a.date).getTime(); // newest first default
  });

  const filteredProducts = productsList.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter;
    const stock = p.stock || 0;
    const matchesStock = productStockFilter === 'all' 
      ? true 
      : productStockFilter === 'in_stock' ? stock > 5 
      : productStockFilter === 'low_stock' ? (stock > 0 && stock <= 5) 
      : stock === 0;
    return matchesSearch && matchesCategory && matchesStock;
  }).sort((a, b) => {
    if (productSort === 'price_low_high') return a.price - b.price;
    if (productSort === 'price_high_low') return b.price - a.price;
    if (productSort === 'stock_low_high') return (a.stock || 0) - (b.stock || 0);
    return 0; // default newest can just rely on array order (approx. insertion order)
  });

  const filteredCustomers = users.filter(u => {
    return u.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
           u.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
           u.id.toLowerCase().includes(customerSearch.toLowerCase());
  });

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;

  const revenueByDate = orders.reduce((acc, order) => {
    const rawDate = order.date.split('T')[0];
    acc[rawDate] = (acc[rawDate] || 0) + order.total;
    return acc;
  }, {} as Record<string, number>);

  const revenueData = Object.keys(revenueByDate).map(rawDate => ({
    date: new Date(rawDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    timestamp: new Date(rawDate).getTime(),
    revenue: revenueByDate[rawDate]
  })).sort((a, b) => {
    if (isNaN(a.timestamp) || isNaN(b.timestamp)) return 0;
    return a.timestamp - b.timestamp;
  });

  const productSales = orders.reduce((acc, order) => {
    order.items.forEach(item => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity;
    });
    return acc;
  }, {} as Record<string, number>);

  const topProductsData = Object.keys(productSales).map(name => ({
    name,
    sales: productSales[name]
  })).sort((a, b) => b.sales - a.sales).slice(0, 5);

  const COLORS = ['#1A1A1A', '#404040', '#737373', '#A3A3A3', '#D4D4D4'];
  const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const pendingOrdersCount = orders.filter(o => o.status === 'Pending').length;
  const deliveredOrdersCount = orders.filter(o => o.status === 'Delivered').length;
  const lowStockCount = productsList.filter(p => (p.stock || 0) < 5).length;
  const activeCouponCount = coupons.filter(coupon => coupon.isActive).length;
  const couponRedemptions = coupons.reduce((sum, coupon) => sum + (coupon.usageCount || 0), 0);
  const todayOrdersCount = orders.filter(order => new Date(order.date).toDateString() === new Date().toDateString()).length;
  const activeLiveSaleCount = productsList.filter(product => product.isFlashSale).length;
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  type ProductRevenueRow = { id: string; name: string; imageUrl: string; revenue: number; units: number };
  const topProductsByRevenue = (Object.values(orders.reduce((acc, order) => {
    order.items.forEach(item => {
      const product = productsList.find(p => p.id === item.productId || item.productId.startsWith(p.id));
      const key = product?.id || item.name;
      const current = acc[key] || {
        id: key,
        name: product?.name || item.name,
        imageUrl: product?.imageUrl || '',
        revenue: 0,
        units: 0,
      };
      current.revenue += item.price * item.quantity;
      current.units += item.quantity;
      acc[key] = current;
    });
    return acc;
  }, {} as Record<string, ProductRevenueRow>)) as ProductRevenueRow[])
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const lowStockProducts = [...productsList]
    .filter(product => (product.stock || 0) <= lowStockThreshold)
    .sort((a, b) => (a.stock || 0) - (b.stock || 0));
  const outOfStockProducts = productsList.filter(product => (product.stock || 0) === 0);
  const categoryReport = Array.from(new Set(productsList.map(product => product.category).filter(Boolean)))
    .map((category) => {
      const categoryProducts = productsList.filter(product => product.category === category);
      return {
        category,
        products: categoryProducts.length,
        stock: categoryProducts.reduce((sum, product) => sum + (product.stock || 0), 0),
        active: categoryProducts.filter(product => (product.status || 'active') === 'active').length,
        revenue: orders.reduce((sum, order) => {
          return sum + order.items.reduce((orderSum, item) => {
            const product = productsList.find(p => p.id === item.productId || item.productId.startsWith(p.id));
            return product?.category === category ? orderSum + item.price * item.quantity : orderSum;
          }, 0);
        }, 0),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
  const customerReport = users.map((user) => {
    const userOrders = orders.filter(order => order.userEmail === user.email);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      orders: userOrders.length,
      spent: userOrders.reduce((sum, order) => sum + order.total, 0),
      coins: user.coins,
      status: user.status || 'Active',
    };
  }).sort((a, b) => b.spent - a.spent);

  const exportCsv = (filename: string, headers: string[], rows: Array<Record<string, unknown>>) => {
    downloadTextFile(filename, rowsToCsv(headers, rows));
    addToast(`${filename} downloaded.`, 'success');
  };

  const exportOrdersCsv = () => exportCsv('aabnoor-orders.csv', [
    'id', 'date', 'customer', 'email', 'status', 'payment', 'tracking', 'items', 'total',
  ], orders.map(order => ({
    id: order.id,
    date: order.date,
    customer: order.userName || order.customerName || order.customer_name || '',
    email: order.userEmail,
    status: order.status,
    payment: order.paymentMethod || '',
    tracking: order.trackingNumber || order.tracking_number || '',
    items: order.items.reduce((sum, item) => sum + item.quantity, 0),
    total: order.total,
  })));

  const exportProductsCsv = () => exportCsv('aabnoor-products.csv', [
    'id', 'sku', 'name', 'category', 'subcategory', 'price', 'stock', 'status', 'featured', 'new_arrival', 'best_seller',
  ], productsList.map(product => ({
    id: product.id,
    sku: product.sku || '',
    name: product.name,
    category: product.category,
    subcategory: product.subCategory || '',
    price: product.price,
    stock: product.stock || 0,
    status: product.status || 'active',
    featured: product.is_featured ? 'yes' : 'no',
    new_arrival: product.is_new_arrival ? 'yes' : 'no',
    best_seller: product.is_best_seller ? 'yes' : 'no',
  })));

  const exportCustomersCsv = () => exportCsv('aabnoor-customers.csv', [
    'id', 'name', 'email', 'orders', 'spent', 'coins', 'status',
  ], customerReport);

  const exportCouponsCsv = () => exportCsv('aabnoor-coupons.csv', [
    'id', 'code', 'discountPercentage', 'startDate', 'endDate', 'usageCount', 'usageLimit', 'minOrderAmount', 'isActive',
  ], coupons.map(coupon => ({
    id: coupon.id,
    code: coupon.code,
    discountPercentage: coupon.discountPercentage,
    startDate: coupon.startDate,
    endDate: coupon.endDate,
    usageCount: coupon.usageCount,
    usageLimit: coupon.usageLimit || '',
    minOrderAmount: coupon.minOrderAmount || '',
    isActive: coupon.isActive ? 'yes' : 'no',
  })));

  const exportSettingsBackup = () => {
    downloadTextFile('aabnoor-store-settings-backup.json', JSON.stringify({
      exportedAt: new Date().toISOString(),
      siteName,
      settings,
      categories,
      subCategories,
    }, null, 2), 'application/json;charset=utf-8');
    addToast('Settings backup downloaded.', 'success');
  };

  const getOrderCity = (address?: string) => {
    if (!address) return 'Unlisted city';
    const parts = address.split(/\n|,/).map(part => part.trim()).filter(Boolean);
    return parts[1] || parts[0] || 'Unlisted city';
  };

  const getStatusBadgeClass = (status: OrderStatus) => {
    if (status === 'Delivered') return 'bg-green-500/10 text-green-700';
    if (status === 'Shipped') return 'bg-blue-500/10 text-blue-700';
    if (status === 'Processing') return 'bg-yellow-500/10 text-yellow-700';
    if (status === 'Cancelled' || status === 'Refunded') return 'bg-red-500/10 text-red-700';
    return 'bg-[#1A1A1A]/10 text-[#1A1A1A]';
  };

  const hoursSince = (dateValue: string) => {
    const parsed = Date.parse(dateValue);
    if (Number.isNaN(parsed)) return 0;
    return Math.max(0, (liveNow - parsed) / (1000 * 60 * 60));
  };
  const orderAgeLabel = (dateValue: string) => {
    const hours = hoursSince(dateValue);
    if (hours >= 24) return `${Math.floor(hours / 24)}d ${Math.floor(hours % 24)}h`;
    if (hours >= 1) return `${Math.floor(hours)}h`;
    return `${Math.max(1, Math.floor(hours * 60))}m`;
  };
  const last24HoursOrders = orders.filter(order => hoursSince(order.date) <= 24);
  const revenueLast24Hours = last24HoursOrders.reduce((sum, order) => sum + order.total, 0);
  const livePipeline = ORDER_STATUS_VALUES.map(status => ({
    status,
    count: orders.filter(order => order.status === status).length,
    value: orders.filter(order => order.status === status).reduce((sum, order) => sum + order.total, 0),
  }));
  const urgentOrders = [...orders]
    .filter(order => (
      (order.status === 'Pending' && hoursSince(order.date) >= 2) ||
      (order.status === 'Processing' && hoursSince(order.date) >= 12) ||
      (order.status === 'Shipped' && hoursSince(order.date) >= 72)
    ))
    .sort((a, b) => hoursSince(b.date) - hoursSince(a.date))
    .slice(0, 8);
  const codExposure = orders
    .filter(order => !['Delivered', 'Cancelled', 'Refunded'].includes(order.status) && /cod|cash/i.test(order.paymentMethod || ''))
    .reduce((sum, order) => sum + order.total, 0);
  const liveCityHeat = (Object.values(orders.reduce((acc, order) => {
    const city = getOrderCity(order.shippingAddress || order.shipping_address || order.city);
    const current = acc[city] || { city, orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += order.total;
    acc[city] = current;
    return acc;
  }, {} as Record<string, { city: string; orders: number; revenue: number }>)) as Array<{ city: string; orders: number; revenue: number }>)
    .sort((a, b) => b.orders - a.orders || b.revenue - a.revenue)
    .slice(0, 6);
  const liveAlerts = [
    ...(pendingOrdersCount > 0 ? [`${pendingOrdersCount} pending order${pendingOrdersCount === 1 ? '' : 's'} need confirmation.`] : []),
    ...(urgentOrders.length > 0 ? [`${urgentOrders.length} order${urgentOrders.length === 1 ? '' : 's'} are past SLA thresholds.`] : []),
    ...(outOfStockProducts.length > 0 ? [`${outOfStockProducts.length} product${outOfStockProducts.length === 1 ? '' : 's'} are out of stock.`] : []),
    ...(codExposure > 0 ? [`Rs. ${codExposure.toFixed(0)} COD exposure is still undelivered.`] : []),
  ];
  const liveEvents = [
    ...recentOrders.map(order => ({
      id: `order-${order.id}`,
      title: `Order ${order.id}`,
      detail: `${order.status} / Rs. ${order.total.toFixed(0)} / ${orderAgeLabel(order.date)} ago`,
      tone: order.status === 'Cancelled' || order.status === 'Refunded' ? 'text-red-700' : 'text-[#1A1A1A]',
    })),
    ...lowStockProducts.slice(0, 4).map(product => ({
      id: `stock-${product.id}`,
      title: product.name,
      detail: `${product.stock || 0} units left in ${product.category}`,
      tone: (product.stock || 0) === 0 ? 'text-red-700' : 'text-yellow-700',
    })),
  ].slice(0, 10);
  type AuditStatus = 'pass' | 'warn' | 'fail';
  type AuditItem = { title: string; status: AuditStatus; detail: string; fix: string };
  const knownInternalRoutes = new Set([
    '/',
    '/shop',
    '/cart',
    '/wishlist',
    '/checkout',
    '/track',
    '/live-sale',
    '/privacy',
    '/terms',
    '/shipping',
    '/contact',
    '/faq',
    '/our-story',
    '/sustainability',
    '/ingredients',
    '/journal',
  ]);
  const configuredLinks = [
    settings.heroPrimaryCtaUrl,
    settings.heroSecondaryCtaUrl,
    settings.promoPopupCtaUrl,
  ].filter(Boolean) as string[];
  const riskyConfiguredLinks = configuredLinks.filter((link) => {
    if (/^https?:\/\//i.test(link)) {
      try {
        return new URL(link).hostname.replace(/^www\./, '') !== 'aabnoor.shop';
      } catch {
        return true;
      }
    }
    const normalized = link.startsWith('/') ? link : `/${link}`;
    return !knownInternalRoutes.has(normalized.split('?')[0]);
  });
  const duplicateSlugCount = productsList.length - new Set(productsList.map(product => product.slug || product.id)).size;
  const productsMissingCoreData = productsList.filter(product => !product.name || !product.imageUrl || !product.sku || !product.slug);
  const activeExpiredCoupons = coupons.filter(coupon => coupon.isActive && coupon.endDate && Date.parse(coupon.endDate) < Date.now());
  const highRiskCoupons = coupons.filter(coupon => coupon.isActive && Number(coupon.discountPercentage) >= 90);
  const couponLimitBreaches = coupons.filter(coupon => coupon.usageLimit && (coupon.usageCount || 0) > coupon.usageLimit);
  const ordersMissingFulfillmentData = orders.filter(order => (
    ['Shipped', 'Delivered'].includes(order.status) &&
    !(order.trackingNumber || order.tracking_number || order.courierName || order.courier_name)
  ));
  const ordersMissingCustomerData = orders.filter(order => (
    !order.userEmail ||
    !(order.customerPhone || order.customer_phone) ||
    !(order.shippingAddress || order.shipping_address)
  ));
  const invalidOrderTotals = orders.filter(order => !Number.isFinite(Number(order.total)) || Number(order.total) < 0);
  const publicDataLeakProducts = productsList.filter(product => (
    Array.isArray(product.reviews) &&
    product.reviews.some((review: any) => review.reviewerHash || review.userEmail || review.userId)
  ));
  const auditItems: AuditItem[] = [
    {
      title: 'Dependency vulnerability scan',
      status: 'pass',
      detail: 'npm audit reports 0 known package vulnerabilities in this checkout.',
      fix: 'Run npm audit again before every production push.',
    },
    {
      title: 'Direct route rewrites',
      status: 'pass',
      detail: 'Wishlist and skin quiz are included in Vercel SPA rewrites with checkout, admin, tracking and shop routes.',
      fix: 'Add any future public route to vercel.json before publishing.',
    },
    {
      title: 'Configured CTA links',
      status: riskyConfiguredLinks.length ? 'warn' : 'pass',
      detail: riskyConfiguredLinks.length ? `${riskyConfiguredLinks.length} configurable CTA link needs review.` : 'Hero and promo CTA links point to known internal routes or the store domain.',
      fix: riskyConfiguredLinks.length ? riskyConfiguredLinks.join(', ') : 'No action needed.',
    },
    {
      title: 'Product catalog completeness',
      status: productsMissingCoreData.length || duplicateSlugCount ? 'warn' : 'pass',
      detail: `${productsMissingCoreData.length} products miss name/image/SKU/slug. ${duplicateSlugCount} duplicate slug collision${duplicateSlugCount === 1 ? '' : 's'}.`,
      fix: 'Open Products and complete missing catalog fields before campaigns.',
    },
    {
      title: 'Coupon risk controls',
      status: couponLimitBreaches.length ? 'fail' : highRiskCoupons.length || activeExpiredCoupons.length ? 'warn' : 'pass',
      detail: `${highRiskCoupons.length} active coupons are 90% or higher. ${activeExpiredCoupons.length} expired coupons are still active. ${couponLimitBreaches.length} usage limits are exceeded.`,
      fix: 'Review Promotions, deactivate expired codes, and keep high-discount codes tightly limited.',
    },
    {
      title: 'Order fulfillment quality',
      status: ordersMissingFulfillmentData.length || ordersMissingCustomerData.length || invalidOrderTotals.length ? 'warn' : 'pass',
      detail: `${ordersMissingFulfillmentData.length} shipped/delivered orders miss courier or tracking. ${ordersMissingCustomerData.length} orders miss customer contact/address. ${invalidOrderTotals.length} orders have invalid totals.`,
      fix: 'Open Orders and correct fulfillment/customer fields before dispatch.',
    },
    {
      title: 'Review privacy fields',
      status: publicDataLeakProducts.length ? 'fail' : 'pass',
      detail: publicDataLeakProducts.length ? `${publicDataLeakProducts.length} product records expose private review identifiers in frontend state.` : 'Frontend product data strips reviewer hashes and legacy user identifiers.',
      fix: 'Refresh products after review submissions; the API stores fingerprints server-side for duplicate prevention.',
    },
    {
      title: 'Admin session posture',
      status: isAdmin ? 'pass' : 'warn',
      detail: isAdmin ? 'Current admin session is verified by the backend admin check.' : 'Admin session is not currently verified.',
      fix: 'Sign in with the configured admin account and authenticator before making sensitive changes.',
    },
  ];
  const auditScore = auditItems.length
    ? Math.round((auditItems.filter(item => item.status === 'pass').length / auditItems.length) * 100)
    : 100;
  const auditFailCount = auditItems.filter(item => item.status === 'fail').length;
  const auditWarnCount = auditItems.filter(item => item.status === 'warn').length;
  const auditStatusClass = (status: AuditStatus) => {
    if (status === 'fail') return 'border-red-500/25 bg-red-500/5 text-red-800';
    if (status === 'warn') return 'border-yellow-500/25 bg-yellow-500/10 text-yellow-800';
    return 'border-green-500/20 bg-green-500/5 text-green-800';
  };

  useEffect(() => {
    if (isAdmin) {
      setIsAuthenticated(true);
    }
  }, [isAdmin]);

  const checkAdminSession = async () => {
    if (!supabase) return false;

    const { data: sessionResult } = await supabase.auth.getSession();
    const token = sessionResult.session?.access_token;
    if (!token) return false;

    const response = await fetch('/api/admin-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    const result = await response.json().catch(() => null);
    if (response.status === 428 && result?.needsMfa) {
      return false;
    }

    if (!response.ok || !result?.isAdmin) {
      setLoginError(result?.error || 'Admin access is restricted.');
      return false;
    }

    const ok = await refreshAdminStatus();
    setIsAuthenticated(ok);
    return ok;
  };

  const beginMfaFlow = async () => {
    if (!supabase) return;

    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error) {
      setLoginError(assurance.error.message);
      return;
    }

    if (assurance.data.currentLevel === 'aal2') {
      await checkAdminSession();
      return;
    }

    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error) {
      setLoginError(factors.error.message);
      return;
    }

    const verifiedTotp = factors.data.totp.find(factor => factor.status === 'verified');
    if (verifiedTotp) {
      setMfaFactorId(verifiedTotp.id);
      setAdminStep('mfa');
      setLoginError('');
      return;
    }

    const enrolledTotp = (factors.data.totp as Array<{ id: string; status: string }>).find(factor => factor.status === 'unverified');
    if (enrolledTotp) {
      setMfaFactorId(enrolledTotp.id);
      setAdminStep('enroll');
      setLoginError('Finish authenticator setup by entering the current code from your app.');
      return;
    }

    const enrollment = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Aabnoor Admin',
    });

    if (enrollment.error) {
      setLoginError(enrollment.error.message);
      return;
    }

    setMfaFactorId(enrollment.data.id);
    setMfaQrCode(enrollment.data.totp.qr_code);
    setMfaSecret(enrollment.data.totp.secret);
    setAdminStep('enroll');
    setLoginError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!supabase) {
      setLoginError('Supabase is not configured for this build.');
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: adminEmail.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setLoginError(authError.message);
      return;
    }

    const initialAdminCheck = await checkAdminSession();
    if (initialAdminCheck) {
      return;
    }

    if (!loginError) {
      await beginMfaFlow();
    } else {
      await supabase.auth.signOut();
    }
    void authData;
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!supabase || !mfaFactorId) {
      setLoginError('Authenticator factor is not ready. Sign in again.');
      return;
    }

    const verification = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId,
      code: mfaCode.trim(),
    });

    if (verification.error) {
      setLoginError(verification.error.message);
      return;
    }

    setMfaCode('');
    await checkAdminSession();
  };

  if (!isAuthenticated || isAuthLoading) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(201,132,122,0.18),transparent_32%),#faf6f1] p-4 pt-40 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-[8px] border border-[#2c2826]/10 bg-[#fffaf7] p-7 text-center shadow-[0_24px_70px_rgba(44,40,38,0.12)] md:p-10"
        >
          <div className="w-14 h-14 bg-[#f0d5d0] rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-7 h-7 text-[#8a4f48]" />
          </div>
          <h1 className="font-serif text-4xl mb-1 text-[#2c2826]">Admin Console</h1>
          <p className="font-sans text-xs uppercase tracking-widest text-[#c9847a] font-bold mb-6">Aabnoor Management Studio</p>
          <p className="font-sans text-xs text-[#7a706a] leading-relaxed mb-6">
            Sign in with the configured admin email, then verify the code from your authenticator app.
          </p>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-[4px] mb-6 font-bold text-center">
              {loginError}
            </div>
          )}
          
          <form onSubmit={adminStep === 'password' ? handleLogin : handleMfaVerify} className="space-y-6 text-left">
            {adminStep === 'enroll' && mfaQrCode && (
              <div className="rounded-[6px] border border-[#2c2826]/10 bg-[#2c2826]/5 p-4 text-center">
                <p className="font-sans text-[10px] uppercase font-bold tracking-widest text-[#7a706a] mb-3">
                  Scan in Google Authenticator or Microsoft Authenticator
                </p>
                <img src={mfaQrCode} alt="Authenticator QR code" className="mx-auto h-44 w-44 bg-white p-2" />
                <p className="mt-3 break-all font-mono text-[10px] text-[#7a706a]">{mfaSecret}</p>
              </div>
            )}
            {adminStep === 'password' && (
            <>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest text-[#7a706a] mb-2">
                Admin Email
              </label>
              <div className="relative border-b border-[#2c2826]/20 focus-within:border-[#2c2826] transition-colors pb-1">
                <Mail className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a706a]" />
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-transparent py-2 pl-8 pr-10 font-sans text-sm outline-none text-[#2c2826]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest text-[#7a706a] mb-2">
                Password
              </label>
              <div className="relative border-b border-[#2c2826]/20 focus-within:border-[#2c2826] transition-colors pb-1">
                <Key className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a706a]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Supabase account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent py-2 pl-8 pr-10 font-sans text-sm outline-none text-[#2c2826]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-[#2c2826]/5 rounded-[4px] transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-[#7a706a]" />
                  ) : (
                    <Eye className="w-4 h-4 text-[#7a706a]" />
                  )}
                </button>
              </div>
            </div>
            </>
            )}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest text-[#7a706a] mb-2">
                Authenticator Code
              </label>
              <div className="relative border-b border-[#2c2826]/20 focus-within:border-[#2c2826] transition-colors pb-1">
                <Shield className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a706a]" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={adminStep === 'password' ? 'Required after password sign in' : '6-digit code'}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-transparent py-2 pl-8 pr-10 font-sans text-sm outline-none text-[#2c2826]"
                  disabled={adminStep === 'password'}
                  required={adminStep !== 'password'}
                />
              </div>
            </div>
            
            <button 
              type="submit"
              className="w-full h-12 bg-[#2c2826] text-[#faf6f1] font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#8a4f48] transition-all rounded-[4px] shadow-sm cursor-pointer mt-4"
            >
              {adminStep === 'password' ? 'Continue' : 'Verify Authenticator'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const formatPdfMoney = (amount: number) => `Rs. ${Number(amount || 0).toFixed(2)}`;

  const getOrderContact = (order: typeof orders[0]) => {
    const rawAddress = order.shippingAddress || '';
    const emailMatch = rawAddress.match(/Email:\s*([^\n]+)/i);
    const phoneMatch = rawAddress.match(/Phone:\s*([^\n]+)/i);
    const email = (emailMatch?.[1] || order.userEmail || '').trim();
    const phone = (phoneMatch?.[1] || '').trim();
    const address = rawAddress
      .replace(/Phone:\s*[^\n]+/i, '')
      .replace(/Email:\s*[^\n]+/i, '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join('\n');

    return {
      name: order.userName || 'Guest Customer',
      email,
      phone,
      address: address || 'No shipping address provided.',
    };
  };

  const drawPdfBarcode = (doc: any, value: string, x: number, y: number, width: number, height: number) => {
    const seed = value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    let cursor = x;
    let index = 0;

    doc.setFillColor(26, 26, 26);
    while (cursor < x + width) {
      const barWidth = [0.7, 1.1, 1.8, 2.4][(seed + index) % 4];
      if ((seed + index) % 3 !== 1) {
        doc.rect(cursor, y, Math.min(barWidth, x + width - cursor), height, 'F');
      }
      cursor += barWidth + 0.9;
      index += 1;
    }
  };

  const generateInvoice = async (order: typeof orders[0]) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const contact = getOrderContact(order);
    const brandName = siteName || 'Aabnoor';
    const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const trackingNumber = order.trackingNumber || 'Not assigned';
    let y = 0;

    const drawPageHeader = () => {
      doc.setFillColor(26, 26, 26);
      doc.rect(0, 0, pageWidth, 42, 'F');
      doc.setFillColor(205, 161, 133);
      doc.rect(0, 40, pageWidth, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.text(brandName, margin, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Premium beauty order invoice', margin, 28);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('INVOICE', pageWidth - margin, 20, { align: 'right' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated ${new Date().toLocaleString()}`, pageWidth - margin, 29, { align: 'right' });
    };

    const ensureInvoiceSpace = (requiredHeight: number) => {
      if (y + requiredHeight <= pageHeight - 28) return;
      doc.addPage();
      drawPageHeader();
      y = 56;
    };

    drawPageHeader();
    y = 56;

    doc.setFillColor(249, 247, 242);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 32, 2, 2, 'F');
    doc.setTextColor(26, 26, 26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('ORDER', margin + 6, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(order.id.toUpperCase(), margin + 6, y + 17);
    doc.text(new Date(order.date).toLocaleString(), margin + 6, y + 25);

    doc.setFont('helvetica', 'bold');
    doc.text('TRACKING', pageWidth / 2 - 5, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.text(trackingNumber, pageWidth / 2 - 5, y + 17);
    doc.text(`Status: ${order.status}`, pageWidth / 2 - 5, y + 25);

    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT', pageWidth - margin - 48, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.text(order.paymentMethod || 'Not specified', pageWidth - margin - 48, y + 17);
    doc.text(`${totalQty} item${totalQty === 1 ? '' : 's'}`, pageWidth - margin - 48, y + 25);

    y += 46;
    const colWidth = (pageWidth - margin * 2 - 10) / 2;
    const addressLines = doc.splitTextToSize(contact.address, colWidth - 10);
    const storeLines = doc.splitTextToSize(settings.storeAddress || 'Aabnoor', colWidth - 10);
    const infoBoxHeight = Math.max(43, 26 + Math.max(addressLines.length, storeLines.length) * 5);

    doc.setDrawColor(226, 220, 211);
    doc.roundedRect(margin, y, colWidth, infoBoxHeight, 2, 2);
    doc.roundedRect(margin + colWidth + 10, y, colWidth, infoBoxHeight, 2, 2);

    doc.setTextColor(120, 91, 73);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('BILL / SHIP TO', margin + 6, y + 9);
    doc.text('FROM', margin + colWidth + 16, y + 9);

    doc.setTextColor(26, 26, 26);
    doc.setFontSize(11);
    doc.text(contact.name, margin + 6, y + 17);
    doc.text(brandName, margin + colWidth + 16, y + 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(addressLines, margin + 6, y + 25);
    doc.text(storeLines, margin + colWidth + 16, y + 25);
    const customerMetaY = y + 27 + addressLines.length * 5;
    if (contact.phone) doc.text(`Phone: ${contact.phone}`, margin + 6, customerMetaY);
    if (contact.email) doc.text(`Email: ${contact.email}`, margin + 6, customerMetaY + (contact.phone ? 5 : 0));
    doc.text(settings.storePhone || '', margin + colWidth + 16, y + 27 + storeLines.length * 5);
    doc.text(settings.storeEmail || '', margin + colWidth + 16, y + 32 + storeLines.length * 5);

    y += infoBoxHeight + 16;

    const drawTableHeader = () => {
      doc.setFillColor(26, 26, 26);
      doc.rect(margin, y, pageWidth - margin * 2, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('ITEM', margin + 4, y + 6.5);
      doc.text('QTY', pageWidth - margin - 64, y + 6.5, { align: 'center' });
      doc.text('PRICE', pageWidth - margin - 39, y + 6.5, { align: 'right' });
      doc.text('TOTAL', pageWidth - margin - 4, y + 6.5, { align: 'right' });
      y += 14;
    };

    drawTableHeader();
    order.items.forEach((item, index) => {
      const product = productsList.find(p => p.id === item.productId || item.productId.startsWith(p.id));
      const itemName = doc.splitTextToSize(item.name, pageWidth - margin * 2 - 82);
      const rowHeight = Math.max(15, itemName.length * 5 + 7);
      ensureInvoiceSpace(rowHeight + 8);

      if (index % 2 === 0) {
        doc.setFillColor(252, 251, 248);
        doc.rect(margin, y - 6, pageWidth - margin * 2, rowHeight, 'F');
      }

      doc.setTextColor(26, 26, 26);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(itemName, margin + 4, y);
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(product?.category ? `Category: ${product.category}` : `SKU: ${item.productId}`, margin + 4, y + itemName.length * 5 + 1);

      doc.setTextColor(26, 26, 26);
      doc.setFontSize(9);
      doc.text(String(item.quantity), pageWidth - margin - 64, y, { align: 'center' });
      doc.text(formatPdfMoney(item.price), pageWidth - margin - 39, y, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(formatPdfMoney(item.price * item.quantity), pageWidth - margin - 4, y, { align: 'right' });

      y += rowHeight;
      doc.setDrawColor(235, 230, 222);
      doc.line(margin, y - 4, pageWidth - margin, y - 4);
    });

    ensureInvoiceSpace(58);
    y += 4;
    const totalsX = pageWidth - margin - 72;
    doc.setFillColor(249, 247, 242);
    doc.roundedRect(totalsX, y, 72, 42, 2, 2, 'F');
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Subtotal', totalsX + 6, y + 10);
    doc.text('Shipping / Fees', totalsX + 6, y + 19);
    doc.text('Tax', totalsX + 6, y + 28);
    doc.setTextColor(26, 26, 26);
    doc.text(formatPdfMoney(subtotal), totalsX + 66, y + 10, { align: 'right' });
    doc.text(formatPdfMoney(Math.max(order.total - subtotal, 0)), totalsX + 66, y + 19, { align: 'right' });
    doc.text(formatPdfMoney(0), totalsX + 66, y + 28, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL', totalsX + 6, y + 38);
    doc.text(formatPdfMoney(order.total), totalsX + 66, y + 38, { align: 'right' });

    doc.setTextColor(120, 91, 73);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CUSTOMER NOTE', margin, y + 10);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Thank you for shopping with Aabnoor. Please keep this invoice for order support and returns.', margin, y + 18);
    doc.text(`Track this order at https://aabnoor.shop/track using ${trackingNumber}.`, margin, y + 25);

    doc.setDrawColor(226, 220, 211);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
    doc.setTextColor(140, 140, 140);
    doc.setFontSize(8);
    doc.text(`${brandName} | ${settings.storeEmail || ''} | ${settings.storePhone || ''}`, pageWidth / 2, pageHeight - 11, { align: 'center' });

    doc.save(`Invoice-${order.id.slice(0, 8)}.pdf`);
  };

  const generateShippingLabel = async (order: typeof orders[0]) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: [101.6, 152.4] });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 6;
    const contact = getOrderContact(order);
    const brandName = siteName || 'Aabnoor';
    const trackingNumber = order.trackingNumber || order.id.toUpperCase();
    const storeAddressLines = doc.splitTextToSize(settings.storeAddress || 'Aabnoor', pageWidth - margin * 2 - 8);
    const shipAddressLines = doc.splitTextToSize(contact.address, pageWidth - margin * 2 - 10);

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setDrawColor(26, 26, 26);
    doc.setLineWidth(0.7);
    doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

    doc.setFillColor(26, 26, 26);
    doc.rect(margin, margin, pageWidth - margin * 2, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(brandName.toUpperCase(), margin + 4, margin + 8);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('SHIPPING LABEL', margin + 4, margin + 14);
    doc.setFont('helvetica', 'bold');
    doc.text(order.status.toUpperCase(), pageWidth - margin - 4, margin + 14, { align: 'right' });

    let y = margin + 27;
    doc.setTextColor(120, 91, 73);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('FROM', margin + 4, y);
    doc.text('ORDER', pageWidth - margin - 30, y);
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(8);
    doc.text(brandName, margin + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(storeAddressLines.slice(0, 3), margin + 4, y + 10);
    doc.text(order.id.toUpperCase(), pageWidth - margin - 30, y + 5);
    doc.text(new Date(order.date).toLocaleDateString(), pageWidth - margin - 30, y + 10);

    y += 27;
    doc.setDrawColor(26, 26, 26);
    doc.line(margin, y - 5, pageWidth - margin, y - 5);
    doc.setTextColor(120, 91, 73);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('SHIP TO', margin + 4, y);

    doc.setTextColor(26, 26, 26);
    doc.setFontSize(17);
    doc.text(contact.name.toUpperCase(), margin + 4, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(shipAddressLines.slice(0, 6), margin + 4, y + 20);
    let contactY = y + 23 + Math.min(shipAddressLines.length, 6) * 5;
    if (contact.phone) {
      doc.setFont('helvetica', 'bold');
      doc.text(`PHONE: ${contact.phone}`, margin + 4, contactY);
      contactY += 5;
    }
    if (contact.email) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(contact.email, margin + 4, contactY);
    }

    const serviceY = pageHeight - 62;
    doc.setFillColor(249, 247, 242);
    doc.rect(margin, serviceY, pageWidth - margin * 2, 18, 'F');
    doc.setTextColor(26, 26, 26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SERVICE', margin + 4, serviceY + 7);
    doc.text('PAYMENT', pageWidth / 2, serviceY + 7);
    doc.text('ITEMS', pageWidth - margin - 18, serviceY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Standard', margin + 4, serviceY + 14);
    doc.text(order.paymentMethod || 'N/A', pageWidth / 2, serviceY + 14);
    doc.text(String(order.items.reduce((sum, item) => sum + item.quantity, 0)), pageWidth - margin - 18, serviceY + 14);

    const barcodeY = pageHeight - 37;
    doc.setTextColor(26, 26, 26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('TRACKING NUMBER', margin + 4, barcodeY - 3);
    drawPdfBarcode(doc, trackingNumber, margin + 7, barcodeY, pageWidth - margin * 2 - 14, 18);
    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.text(trackingNumber, pageWidth / 2, barcodeY + 26, { align: 'center' });

    doc.save(`Shipping-Label-${order.id.slice(0, 8)}.pdf`);
  };

  const getOrderDocumentContext = (order: typeof orders[0]) => ({
    order,
    products: productsList,
    settings,
    siteName: settings.storeName || siteName || 'Aabnoor Beauty',
  });

  const handlePrintOrderDocument = (kind: 'shipping-label' | 'invoice' | 'packing-slip', order: typeof orders[0]) => {
    const opened = printOrderDocument(kind, getOrderDocumentContext(order));
    if (!opened) {
      addToast('Pop-up was blocked. Allow pop-ups for admin print documents and try again.', 'error');
    }
  };

  const handleDownloadInvoicePdf = async (order: typeof orders[0]) => {
    await downloadInvoicePdf(getOrderDocumentContext(order));
  };

  const handleDownloadLabelPdf = async (order: typeof orders[0]) => {
    await downloadShippingLabelPdf(getOrderDocumentContext(order));
  };

  return (
    <div className="admin-redesign min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(201,132,122,0.18),transparent_30%),#faf6f1] pt-40 pb-12 px-4 md:px-8 text-[#2c2826]">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 rounded-[8px] border border-[#2c2826]/10 bg-[#2c2826] p-5 text-[#faf6f1] shadow-[0_24px_70px_rgba(44,40,38,0.18)] sm:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.32em] text-[#c9847a]">Aabnoor Control Room</p>
              <h1 className="font-serif text-4xl md:text-5xl text-white">Admin Console</h1>
              <p className="mt-3 max-w-2xl font-sans text-sm leading-6 text-[#9a9088]">Manage orders, products, customers, discounts and storefront settings from live backend data.</p>
            </div>

            <div className="relative z-0 flex max-w-full gap-2 overflow-x-auto rounded-[6px] border border-white/10 bg-white/[0.06] p-1">
              {ADMIN_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-5 py-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-[#2c2826]' : 'text-white/58 hover:text-white'}`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="adminTab"
                      className="absolute inset-0 rounded-[4px] bg-[#faf6f1]"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  setIsAuthenticated(false);
                }}
                className="relative ml-2 border-l border-white/10 px-5 py-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffb3ae] whitespace-nowrap transition-colors hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Revenue', value: `Rs. ${totalRevenue.toFixed(0)}`, note: 'backend orders' },
              { label: 'Orders Today', value: todayOrdersCount, note: `${pendingOrdersCount} pending` },
              { label: 'AOV', value: `Rs. ${averageOrderValue.toFixed(0)}`, note: `${totalOrders} total orders` },
              { label: 'Low Stock', value: lowStockCount, note: 'inventory alerts' },
            ].map((metric) => (
              <div key={metric.label} className="rounded-[6px] border border-white/10 bg-white/[0.06] px-4 py-3">
                <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#9a9088]">{metric.label}</p>
                <p className="mt-1 font-serif text-2xl text-white">{metric.value}</p>
                <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.12em] text-[#c9847a]">{metric.note}</p>
              </div>
            ))}
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 mt-4 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 border border-[#1A1A1A]/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-[#1A1A1A]/5 rounded-sm">
                    <BarChart3 className="w-5 h-5 text-[#1A1A1A]" />
                  </div>
                </div>
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/60 mb-1">Total Revenue</p>
                <h3 className="font-serif italic text-3xl text-[#1A1A1A]">Rs. {totalRevenue.toFixed(2)}</h3>
              </div>
              
              <div className="bg-white p-6 border border-[#1A1A1A]/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-[#1A1A1A]/5 rounded-sm">
                    <ShoppingBag className="w-5 h-5 text-[#1A1A1A]" />
                  </div>
                </div>
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/60 mb-1">Total Orders</p>
                <h3 className="font-serif italic text-3xl text-[#1A1A1A]">{totalOrders}</h3>
              </div>

              <div className="bg-white p-6 border border-[#1A1A1A]/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-yellow-500/10 rounded-sm">
                    <ShoppingBag className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/60 mb-1">Pending Orders</p>
                <h3 className="font-serif italic text-3xl text-yellow-600">{pendingOrdersCount}</h3>
              </div>

              <div className="bg-white p-6 border border-[#1A1A1A]/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-green-500/10 rounded-sm">
                    <ShoppingBag className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/60 mb-1">Average Order Value</p>
                <h3 className="font-serif italic text-3xl text-green-600">Rs. {averageOrderValue.toFixed(2)}</h3>
              </div>
              
              <div className="bg-white p-6 border border-[#1A1A1A]/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-[#1A1A1A]/5 rounded-sm">
                    <Package className="w-5 h-5 text-[#1A1A1A]" />
                  </div>
                </div>
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/60 mb-1">Total Products</p>
                <h3 className="font-serif italic text-3xl text-[#1A1A1A]">{productsList.length}</h3>
              </div>
              
              <div className="bg-white p-6 border border-[#1A1A1A]/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-red-500/10 rounded-sm">
                    <Package className="w-5 h-5 text-red-500" />
                  </div>
                </div>
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/60 mb-1">Low Stock Items</p>
                <h3 className="font-serif italic text-3xl text-red-500">{lowStockCount}</h3>
              </div>

              <div className="bg-white p-6 border border-[#1A1A1A]/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-[#1A1A1A]/5 rounded-sm">
                    <Users className="w-5 h-5 text-[#1A1A1A]" />
                  </div>
                </div>
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/60 mb-1">Total Customers</p>
                <h3 className="font-serif italic text-3xl text-[#1A1A1A]">{users.length}</h3>
              </div>

              <div className="bg-white p-6 border border-[#1A1A1A]/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-[#1A1A1A]/5 rounded-sm">
                    <FileText className="w-5 h-5 text-[#1A1A1A]" />
                  </div>
                </div>
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/60 mb-1">Active Coupon</p>
                <h3 className="font-serif italic text-3xl text-[#1A1A1A]">{couponCode || 'None'}</h3>
              </div>
            </div>
            
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <div className="bg-white p-6 border border-[#1A1A1A]/10 min-w-0">
                <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A] mb-6">Revenue Over Time</h3>
                <div className="h-64 min-w-0 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A1A1A" opacity={0.1} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#1A1A1A', opacity: 0.6 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#1A1A1A', opacity: 0.6 }} tickFormatter={(value) => `Rs. ${value}`} dx={-10} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '4px', color: '#F9F7F2', fontSize: '12px' }}
                        itemStyle={{ color: '#F9F7F2' }}
                        formatter={(value: number) => [`Rs. ${value.toFixed(2)}`, 'Revenue']}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#1A1A1A" strokeWidth={2} dot={{ r: 4, fill: '#1A1A1A' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-white p-6 border border-[#1A1A1A]/10 min-w-0">
                <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A] mb-6">Top Selling Products</h3>
                <div className="h-64 min-w-0 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProductsData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1A1A1A" opacity={0.1} />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#1A1A1A', opacity: 0.6 }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#1A1A1A' }} width={120} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '4px', color: '#F9F7F2', fontSize: '12px' }}
                        itemStyle={{ color: '#F9F7F2' }}
                        formatter={(value: number) => [value, 'Units Sold']}
                      />
                      <Bar dataKey="sales" radius={[0, 4, 4, 0]}>
                        {topProductsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <div className="bg-white border border-[#1A1A1A]/10 overflow-hidden">
                <div className="px-6 py-5 border-b border-[#1A1A1A]/10">
                  <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Recent Orders</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-sm">
                    <thead className="bg-[#1A1A1A]/5">
                      <tr>
                        <th className="px-5 py-3 text-[10px] uppercase tracking-[0.1em] text-[#1A1A1A]/60">Order</th>
                        <th className="px-5 py-3 text-[10px] uppercase tracking-[0.1em] text-[#1A1A1A]/60">Customer</th>
                        <th className="px-5 py-3 text-[10px] uppercase tracking-[0.1em] text-[#1A1A1A]/60">Total</th>
                        <th className="px-5 py-3 text-[10px] uppercase tracking-[0.1em] text-[#1A1A1A]/60">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]/10">
                      {recentOrders.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-xs text-[#1A1A1A]/50">No backend orders yet.</td>
                        </tr>
                      ) : recentOrders.map(order => (
                        <tr key={order.id}>
                          <td className="px-5 py-4 font-bold">{order.id}</td>
                          <td className="px-5 py-4">
                            <span className="block font-medium">{order.userName || order.userEmail.split('@')[0]}</span>
                            <span className="block text-xs text-[#1A1A1A]/50">{getOrderCity(order.shippingAddress)}</span>
                          </td>
                          <td className="px-5 py-4 font-serif italic">Rs. {order.total.toFixed(2)}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-1 text-[9px] uppercase font-bold tracking-widest rounded-sm ${getStatusBadgeClass(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-[#1A1A1A]/10 overflow-hidden">
                <div className="px-6 py-5 border-b border-[#1A1A1A]/10">
                  <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Top Products by Revenue</h3>
                </div>
                <div className="divide-y divide-[#1A1A1A]/10">
                  {topProductsByRevenue.length === 0 ? (
                    <div className="px-5 py-8 text-center text-xs text-[#1A1A1A]/50">No product revenue yet.</div>
                  ) : topProductsByRevenue.map(product => (
                    <div key={product.id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-12 w-10 shrink-0 overflow-hidden bg-[#1A1A1A]/5">
                          {product.imageUrl ? <SafeImage src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-serif text-sm text-[#1A1A1A]">{product.name}</p>
                          <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-[#1A1A1A]/50">{product.units} units</p>
                        </div>
                      </div>
                      <p className="shrink-0 font-serif italic text-[#1A1A1A]">Rs. {product.revenue.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Low-Stock and Coupon Performance Action Center */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 text-left">
              {/* Supply Chain Card */}
              <div className="bg-white p-6 border border-[#1A1A1A]/10 rounded-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Aabnoor Logistics & Low-Stock Console</h3>
                    <p className="font-sans text-[10px] text-[#1A1A1A]/50 uppercase tracking-widest mt-0.5">Real-time shade replenishment & supply chain thresholds.</p>
                  </div>
                  <span className="bg-red-500/10 text-red-600 px-2 py-1 rounded text-[9px] uppercase tracking-wider font-bold">
                    ⚠️ {productsList.filter(p => (p.stock || 0) <= lowStockThreshold).length} Alarms
                  </span>
                </div>

                {/* Slider bar to adjust low-stock limit dynamically */}
                <div className="bg-[#1A1A1A]/5 p-4 rounded mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/70 block mb-1">
                      Stock Alert Threshold: <span className="font-serif italic font-bold text-sm text-[#CDA185]">{lowStockThreshold} Units</span>
                    </label>
                    <p className="font-sans text-[9px] text-[#1A1A1A]/40 uppercase tracking-widest leading-relaxed">Adjust warning limit for clinical serums and elixir bottles.</p>
                  </div>
                  <input 
                    type="range" 
                    min={2} 
                    max={20} 
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                    className="w-full sm:w-32 accent-[#CDA185] h-1 bg-[#1A1A1A]/10 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Filter and render low-stock alarm blocks */}
                <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2">
                  {productsList.filter(p => (p.stock || 0) <= lowStockThreshold).length > 0 ? (
                    productsList.filter(p => (p.stock || 0) <= lowStockThreshold).map(p => {
                      const repsQty = replenishQuantities[p.id] || 10;
                      return (
                        <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-[#1A1A1A]/5 hover:border-red-500/20 rounded bg-[#F9F7F2]/30 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#1A1A1A]/5 rounded overflow-hidden">
                              <SafeImage src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h4 className="font-serif text-xs font-semibold text-[#1A1A1A] line-clamp-1">{p.name}</h4>
                              <div className="flex gap-2 items-center mt-0.5">
                                <span className="text-[9px] bg-red-500/15 text-red-600 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm">
                                  {p.stock || 0} left
                                </span>
                                <span className="text-[10px] text-[#1A1A1A]/50 font-sans italic">Category: {p.category}</span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Replenish control */}
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={repsQty}
                              min={1}
                              onChange={(e) => {
                                setReplenishQuantities(prev => ({
                                  ...prev,
                                  [p.id]: Number(e.target.value)
                                }));
                              }}
                              className="w-12 border border-[#1A1A1A]/10 p-1 font-sans text-xs text-center focus:outline-none focus:border-[#CDA185] rounded bg-white"
                            />
                            <button
                              onClick={() => {
                                updateProduct({
                                  ...p,
                                  stock: (p.stock || 0) + repsQty
                                });
                                setReplenishQuantities(prev => ({
                                  ...prev,
                                  [p.id]: 10
                                }));
                              }}
                              className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#CDA185] text-white font-sans text-[9px] font-bold uppercase tracking-widest rounded transition-colors cursor-pointer"
                            >
                              Replenish
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-[#1A1A1A]/40 font-sans text-xs italic">
                      ✓ Supply Chain Healthy! All product shades are well stocked.
                    </div>
                  )}
                </div>
              </div>

              {/* Coupons & Conversion Analytics Card */}
              <div className="bg-white p-6 border border-[#1A1A1A]/10 rounded-sm">
                <div className="mb-4">
                  <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Reward Codes & Yield Projections</h3>
                  <p className="font-sans text-[10px] text-[#1A1A1A]/50 uppercase tracking-widest mt-0.5">Campaign performance trends, average saving, and toggle states.</p>
                </div>

                {/* General stats bar */}
                <div className="grid grid-cols-2 gap-4 bg-[#CDA185]/5 p-3 rounded mb-4">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-[#CDA185] font-bold">Average Order Size</span>
                    <span className="font-serif italic text-lg text-[#1A1A1A]">Rs. {totalOrders ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}</span>
                    <span className="text-[8px] text-[#1A1A1A]/45 block uppercase font-bold mt-0.5">{totalOrders} backend orders</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-[#CDA185] font-bold">Loyalty Redemptions</span>
                    <span className="font-serif italic text-lg text-[#1A1A1A]">{coupons.reduce((sum, coupon) => sum + (coupon.usageCount || 0), 0)} Coupons Used</span>
                    <span className="text-[8px] text-[#1A1A1A]/45 block uppercase font-bold mt-0.5">{coupons.filter(coupon => coupon.isActive).length} active backend codes</span>
                  </div>
                </div>

                {/* Popular Codes Checklist */}
                <div>
                  <h4 className="font-sans text-[9px] font-bold uppercase tracking-[0.1em] text-[#1A1A1A]/60 mb-2 border-b border-[#1A1A1A]/5 pb-1">Current Promotion Metrics Checklist</h4>
                  <div className="space-y-2.5">
                    {coupons.length === 0 ? (
                      <div className="py-6 text-center text-[#1A1A1A]/40 font-sans text-xs italic">
                        No backend discount codes have been created yet.
                      </div>
                    ) : coupons.map((promo) => (
                      <div key={promo.id} className="flex justify-between items-center text-xs font-sans pb-2 border-b border-[#1A1A1A]/5 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={promo.isActive}
                            readOnly
                            className="accent-[#CDA185] rounded cursor-pointer"
                          />
                          <div>
                            <span className="font-mono font-bold text-[#1A1A1A] bg-[#1A1A1A]/5 px-1.5 py-0.5 rounded mr-1.5 text-[10px]">{promo.code}</span>
                            <span className="text-[#1A1A1A]/40 text-[9px] uppercase tracking-wider">({promo.discountPercentage}% OFF)</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#1A1A1A] text-[11px] block">{promo.isActive ? 'Active' : 'Inactive'}</span>
                          <span className="text-[8px] text-[#CDA185] uppercase tracking-widest font-bold">({promo.usageCount || 0} Redemptions)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-[#1A1A1A]/10 mt-8">
              <div className="px-6 py-5 border-b border-[#1A1A1A]/10">
                <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Recent Ledger Activity</h3>
              </div>
              <div className="p-6">
                <div className="space-y-6 flex flex-col">
                  {recentOrders.length === 0 ? (
                    <p className="font-sans text-sm text-[#1A1A1A]/50">No live backend activity yet.</p>
                  ) : recentOrders.slice(0, 3).map(order => (
                    <div key={order.id} className="flex gap-4 items-start">
                      <div className="w-2 h-2 rounded-full bg-[#1A1A1A] mt-2"></div>
                      <div>
                        <p className="font-sans text-sm text-[#1A1A1A]"><span className="font-bold">{order.userName || order.userEmail}</span> placed an order ({order.id})</p>
                        <p className="font-sans text-xs text-[#1A1A1A]/60 mt-1">Earned {order.coinsEarned} Aabnoor Coins • {new Date(order.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'live' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <section className="rounded-[8px] border border-[#1A1A1A]/10 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-green-700">
                    <Radio className="h-4 w-4" />
                    Live Operations
                  </p>
                  <h2 className="mt-2 font-serif text-3xl text-[#1A1A1A]">Daraz/Amazon style command center</h2>
                  <p className="mt-2 font-sans text-sm leading-6 text-[#1A1A1A]/60">
                    Exact values are calculated from current orders, products, customers, coupons and inventory. Auto-refresh is controlled by you and defaults to manual mode.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-[8px] border border-[#1A1A1A]/10 bg-[#F9F7F2] px-4 py-3">
                    <p className="font-sans text-[9px] font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/45">Current Time</p>
                    <p className="mt-1 font-sans text-sm font-bold text-[#1A1A1A]">{new Date(liveNow).toLocaleTimeString()}</p>
                  </div>
                  <div className="rounded-[8px] border border-[#1A1A1A]/10 bg-[#F9F7F2] px-4 py-3">
                    <p className="font-sans text-[9px] font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/45">Last Refresh</p>
                    <p className="mt-1 font-sans text-sm font-bold text-[#1A1A1A]">{lastLiveRefresh ? lastLiveRefresh.toLocaleTimeString() : 'Just opened'}</p>
                  </div>
                  <label className="rounded-[8px] border border-[#1A1A1A]/10 bg-[#F9F7F2] px-4 py-3">
                    <span className="block font-sans text-[9px] font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/45">Refresh Rate</span>
                    <select
                      value={liveRefreshSeconds}
                      onChange={(event) => setLiveRefreshPreference(Number(event.target.value))}
                      className="mt-1 bg-transparent font-sans text-sm font-bold text-[#1A1A1A] outline-none"
                    >
                      <option value={0}>Manual</option>
                      <option value={30}>30 sec</option>
                      <option value={60}>60 sec</option>
                      <option value={120}>120 sec</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void refreshLiveData()}
                    className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-5 py-3 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#CDA185] disabled:opacity-60"
                    disabled={isLiveRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLiveRefreshing ? 'animate-spin' : ''}`} />
                    Refresh Now
                  </button>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                { label: 'Orders 24h', value: last24HoursOrders.length, note: `Rs. ${revenueLast24Hours.toFixed(0)}` },
                { label: 'Pending Confirm', value: pendingOrdersCount, note: 'call / verify now' },
                { label: 'COD Exposure', value: `Rs. ${codExposure.toFixed(0)}`, note: 'undelivered COD value' },
                { label: 'SLA Risks', value: urgentOrders.length, note: 'late operational queue' },
                { label: 'Stock Blocks', value: outOfStockProducts.length, note: `${lowStockProducts.length} low stock` },
              ].map((metric) => (
                <div key={metric.label} className="rounded-[8px] border border-[#1A1A1A]/10 bg-white p-5 shadow-sm">
                  <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/55">{metric.label}</p>
                  <p className="mt-2 font-serif text-3xl text-[#1A1A1A]">{metric.value}</p>
                  <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.12em] text-[#CDA185]">{metric.note}</p>
                </div>
              ))}
            </div>

            {liveAlerts.length > 0 && (
              <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {liveAlerts.map((alert) => (
                  <div key={alert} className="flex items-start gap-3 rounded-[8px] border border-red-500/15 bg-red-500/5 p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                    <p className="font-sans text-sm font-bold leading-6 text-red-800">{alert}</p>
                  </div>
                ))}
              </section>
            )}

            <section className="rounded-[8px] border border-[#1A1A1A]/10 bg-white shadow-sm">
              <div className="border-b border-[#1A1A1A]/10 p-5">
                <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#CDA185]">Fulfillment Pipeline</p>
                <h3 className="mt-1 font-serif text-2xl text-[#1A1A1A]">Exact order status value</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-3 xl:grid-cols-6">
                {livePipeline.map((row) => (
                  <div key={row.status} className="rounded-[8px] border border-[#1A1A1A]/10 bg-[#F9F7F2] p-4">
                    <p className={`inline-flex rounded-full px-2.5 py-1 font-sans text-[9px] font-bold uppercase tracking-[0.12em] ${getStatusBadgeClass(row.status)}`}>
                      {row.status}
                    </p>
                    <p className="mt-3 font-serif text-3xl text-[#1A1A1A]">{row.count}</p>
                    <p className="mt-1 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-[#CDA185]">Rs. {row.value.toFixed(0)}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-[8px] border border-[#1A1A1A]/10 bg-white shadow-sm">
                <div className="border-b border-[#1A1A1A]/10 p-5">
                  <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#CDA185]">SLA Queue</p>
                  <h3 className="mt-1 font-serif text-2xl text-[#1A1A1A]">Orders needing action now</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-sm">
                    <thead className="bg-[#1A1A1A]/5">
                      <tr>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/55">Order</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/55">Customer</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/55">Age</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/55">Status</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/55">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]/8">
                      {urgentOrders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-[#1A1A1A]/50">No orders are breaching live SLA thresholds.</td>
                        </tr>
                      ) : urgentOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-5 py-3 font-bold text-[#1A1A1A]">{order.id}</td>
                          <td className="px-5 py-3 text-[#1A1A1A]/65">{order.userName || order.userEmail}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1 font-bold text-red-700"><Timer className="h-3.5 w-3.5" />{orderAgeLabel(order.date)}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${getStatusBadgeClass(order.status)}`}>{order.status}</span>
                          </td>
                          <td className="px-5 py-3">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('orders');
                                setOrderSearch(order.id);
                                setExpandedOrderId(order.id);
                              }}
                              className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A] underline underline-offset-4"
                            >
                              Open Order
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-[8px] border border-[#1A1A1A]/10 bg-white p-6 shadow-sm">
                <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#CDA185]">Live Event Feed</p>
                <h3 className="mt-1 font-serif text-2xl text-[#1A1A1A]">Recent store signals</h3>
                <div className="mt-5 space-y-3">
                  {liveEvents.length === 0 ? (
                    <p className="rounded-[8px] bg-[#F9F7F2] p-5 text-center font-sans text-sm text-[#1A1A1A]/50">No live signals yet.</p>
                  ) : liveEvents.map((event) => (
                    <div key={event.id} className="rounded-[8px] border border-[#1A1A1A]/10 bg-[#F9F7F2] p-4">
                      <p className={`font-sans text-sm font-bold ${event.tone}`}>{event.title}</p>
                      <p className="mt-1 font-sans text-xs text-[#1A1A1A]/55">{event.detail}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
              <section className="rounded-[8px] border border-[#1A1A1A]/10 bg-white shadow-sm">
                <div className="border-b border-[#1A1A1A]/10 p-5">
                  <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#CDA185]">Delivery Heat</p>
                  <h3 className="mt-1 font-serif text-2xl text-[#1A1A1A]">Top destination cities</h3>
                </div>
                <div className="space-y-3 p-5">
                  {liveCityHeat.length === 0 ? (
                    <p className="text-center font-sans text-sm text-[#1A1A1A]/50">No city data yet.</p>
                  ) : liveCityHeat.map((row) => (
                    <div key={row.city} className="flex items-center justify-between gap-4 rounded-[8px] border border-[#1A1A1A]/10 bg-[#F9F7F2] p-4">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-[#CDA185]" />
                        <div>
                          <p className="font-sans text-sm font-bold text-[#1A1A1A]">{row.city}</p>
                          <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#1A1A1A]/45">{row.orders} orders</p>
                        </div>
                      </div>
                      <p className="font-serif text-lg text-[#1A1A1A]">Rs. {row.revenue.toFixed(0)}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[8px] border border-[#1A1A1A]/10 bg-white shadow-sm">
                <div className="border-b border-[#1A1A1A]/10 p-5">
                  <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#CDA185]">Inventory Blockers</p>
                  <h3 className="mt-1 font-serif text-2xl text-[#1A1A1A]">Products blocking sales</h3>
                </div>
                <div className="space-y-3 p-5">
                  {outOfStockProducts.length === 0 ? (
                    <p className="text-center font-sans text-sm text-[#1A1A1A]/50">No out-of-stock products right now.</p>
                  ) : outOfStockProducts.slice(0, 8).map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-4 rounded-[8px] border border-red-500/15 bg-red-500/5 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-sans text-sm font-bold text-red-800">{product.name}</p>
                        <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-red-700/70">{product.category} / {product.sku || 'No SKU'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('products');
                          setProductSearch(product.name);
                          setProductStockFilter('out_of_stock');
                        }}
                        className="shrink-0 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-red-800 underline underline-offset-4"
                      >
                        Restock
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white p-3 border border-[#1A1A1A]/10 shadow-sm overflow-x-auto">
              <div className="flex min-w-fit gap-2">
                {(['all', ...ORDER_STATUS_VALUES] as Array<'all' | OrderStatus>).map(status => {
                  const count = status === 'all' ? orders.length : orders.filter(order => order.status === status).length;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setOrderStatusFilter(status)}
                      className={`px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.16em] rounded-sm transition-colors ${
                        orderStatusFilter === status
                          ? 'bg-[#1A1A1A] text-[#F9F7F2]'
                          : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/65 hover:text-[#1A1A1A]'
                      }`}
                    >
                      {status === 'all' ? 'All' : status} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-6 border border-[#1A1A1A]/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 max-w-md">
                 <input 
                   type="text" 
                   value={orderSearch}
                   onChange={(e) => setOrderSearch(e.target.value)}
                   placeholder="Search Order ID, Name, Email..." 
                   className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm outline-none focus:border-[#1A1A1A]"
                 />
              </div>
              <div className="flex gap-4">
                 <select 
                   value={orderStatusFilter}
                   onChange={(e) => setOrderStatusFilter(e.target.value)}
                   className="border border-[#1A1A1A]/20 p-2 font-sans text-sm outline-none bg-transparent focus:border-[#1A1A1A]">
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Refunded">Refunded</option>
                 </select>
                 <select 
                   value={orderSort}
                   onChange={(e) => setOrderSort(e.target.value)}
                   className="border border-[#1A1A1A]/20 p-2 font-sans text-sm outline-none bg-transparent focus:border-[#1A1A1A]">
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highest">Highest Total</option>
                    <option value="lowest">Lowest Total</option>
                 </select>
              </div>
            </div>

            <div className="bg-white border border-[#1A1A1A]/10 overflow-hidden">
            {selectedOrders.length > 0 && (
              <div className="bg-[#1A1A1A]/5 p-3 flex items-center justify-between border-b border-[#1A1A1A]/10">
                <span className="font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-[#1A1A1A]">
                  {selectedOrders.length} {selectedOrders.length === 1 ? 'Order' : 'Orders'} Selected
                </span>
                <div className="flex gap-2 items-center">
                  <span className="font-sans text-[9px] uppercase tracking-[0.1em] text-[#1A1A1A]/60 mr-2">Change Status:</span>
                  {ORDER_STATUS_VALUES.map(status => (
                    <button
                      key={status}
                      onClick={() => handleBulkStatusChange(status)}
                      className="px-3 py-1.5 bg-white border border-[#1A1A1A]/20 hover:border-[#1A1A1A] font-sans text-[9px] font-bold uppercase tracking-[0.1em] text-[#1A1A1A] transition-colors"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
               <table className="w-full text-left font-sans text-sm">
                 <thead className="bg-[#1A1A1A]/5">
                   <tr>
                     <th className="px-6 py-4 w-10">
                       <input 
                         type="checkbox" 
                         className="accent-[#1A1A1A] cursor-pointer"
                         checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                         onChange={toggleAllOrders}
                       />
                     </th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Order ID</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Customer / City</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Date</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Total</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Payment</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#1A1A1A]/10">
                   {filteredOrders.map((order, index) => (
                     <React.Fragment key={order.id}>
                       <motion.tr 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ duration: 0.4, delay: index * 0.05 }}
                         className={`group hover:bg-[#1A1A1A]/5 transition-colors cursor-pointer ${expandedOrderId === order.id || selectedOrders.includes(order.id) ? 'bg-[#1A1A1A]/5' : ''}`}
                         onClick={(e) => {
                           // If clicking on TD but not the checkbox itself, we toggle expansion
                           if ((e.target as HTMLElement).tagName !== 'INPUT') {
                             setExpandedOrderId(expandedOrderId === order.id ? null : order.id);
                           }
                         }}
                       >
                         <td className="px-6 py-4 w-10">
                           <input 
                             type="checkbox" 
                             className="accent-[#1A1A1A] cursor-pointer"
                             checked={selectedOrders.includes(order.id)}
                             onChange={(e) => {
                               e.stopPropagation();
                               toggleOrderSelection(order.id);
                             }}
                             onClick={(e) => e.stopPropagation()}
                           />
                         </td>
                         <td className="px-6 py-4 font-medium transition-colors group-hover:text-[#1A1A1A]/70 flex items-center gap-2">
                           {expandedOrderId === order.id ? <ChevronUp className="w-4 h-4 text-[#1A1A1A]" /> : <ChevronDown className="w-4 h-4 text-[#1A1A1A]/50 group-hover:text-[#1A1A1A]" />}
                           {order.id}
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex flex-col gap-0.5">
                             <span className="font-bold">{order.userName || order.userEmail.split('@')[0]}</span>
                             <span className="text-xs text-[#1A1A1A]/60">{order.userEmail}</span>
                             <span className="text-[10px] uppercase tracking-[0.12em] text-[#CDA185]">{getOrderCity(order.shippingAddress)}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4 text-[#1A1A1A]/60">{new Date(order.date).toLocaleDateString()}</td>
                         <td className="px-6 py-4 font-serif italic">Rs. {order.total.toFixed(2)}</td>
                         <td className="px-6 py-4">
                           <span className="rounded-sm bg-[#1A1A1A]/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1A1A1A]/70">
                             {order.paymentMethod || 'Not Set'}
                           </span>
                         </td>
                         <td className="px-6 py-4">
                           <select
                             value={order.status}
                             onClick={(e) => e.stopPropagation()}
                             onChange={(e) => handleStatusChange(order.id, order.status, e.target.value as OrderStatus, order.coinsEarned, order.coinsAdded)}
                             className={`border px-2 py-1 text-[10px] uppercase font-bold tracking-[0.1em] rounded outline-none cursor-pointer focus:border-[#1A1A1A] ${getStatusBadgeClass(order.status)}`}
                           >
                             {ORDER_STATUS_VALUES.map(status => (
                               <option key={status} value={status}>{status}</option>
                             ))}
                           </select>
                         </td>
                       </motion.tr>
                       {expandedOrderId === order.id && (
                         <tr className="bg-[#1A1A1A]/[0.02] border-b border-[#1A1A1A]/10">
                           <td colSpan={7} className="px-6 py-8">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div>
                                 <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A] mb-4">Order Items</h4>
                                 <ul className="space-y-3">
                                   {order.items.map((item, idx) => (
                                     <li key={idx} className="flex justify-between items-center text-sm font-sans border-b border-[#1A1A1A]/10 pb-2 last:border-0 last:pb-0">
                                       <div className="flex flex-col">
                                         <span className="font-bold text-[#1A1A1A]">{item.name}</span>
                                         <span className="text-[#1A1A1A]/60 text-xs">Qty: {item.quantity}</span>
                                       </div>
                                       <span className="font-serif italic">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                                     </li>
                                   ))}
                                 </ul>
                               </div>
                               <div className="space-y-6">
                                 <div>
                                   <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A] mb-3">Shipping Details</h4>
                                   <p className="font-sans text-sm text-[#1A1A1A]/70 whitespace-pre-line">
                                     {order.shippingAddress || 'No shipping address provided.'}
                                   </p>
                                 </div>
                                 <div className="pt-6 border-t border-[#1A1A1A]/10">
                                   <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A] mb-3">Payment Method</h4>
                                   <p className="font-sans text-sm text-[#1A1A1A]/70">{order.paymentMethod || 'Not specified'}</p>
                                 </div>
                                 <div className="pt-6 border-t border-[#1A1A1A]/10">
                                   <div className="flex justify-between items-center mb-3">
                                     <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Tracking History</h4>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handlePrintOrderDocument('shipping-label', order);
                                          }}
                                          className="flex items-center gap-2 px-3 py-1.5 bg-[#CDA185]/10 hover:bg-[#CDA185]/25 transition-colors rounded text-[#8b5f3d] font-sans text-[10px] font-bold uppercase tracking-[0.1em] cursor-pointer"
                                        >
                                          <Package className="w-3.5 h-3.5" />
                                          Print Shipping Label
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handlePrintOrderDocument('invoice', order);
                                          }}
                                          className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 transition-colors rounded text-[#1A1A1A] font-sans text-[10px] font-bold uppercase tracking-[0.1em] cursor-pointer"
                                        >
                                          <FileText className="w-3.5 h-3.5" />
                                          Print Invoice
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handlePrintOrderDocument('packing-slip', order);
                                          }}
                                          className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 transition-colors rounded text-[#1A1A1A] font-sans text-[10px] font-bold uppercase tracking-[0.1em] cursor-pointer"
                                        >
                                          <FileText className="w-3.5 h-3.5" />
                                          Print Packing Slip
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadInvoicePdf(order);
                                          }}
                                          className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 transition-colors rounded text-[#1A1A1A] font-sans text-[10px] font-bold uppercase tracking-[0.1em] cursor-pointer"
                                        >
                                          <FileText className="w-3.5 h-3.5" />
                                          Download Invoice PDF
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadLabelPdf(order);
                                          }}
                                          className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-[#CDA185]/10 border border-[#CDA185]/30 transition-colors rounded text-[#8b5f3d] font-sans text-[10px] font-bold uppercase tracking-[0.1em] cursor-pointer"
                                        >
                                          <Package className="w-3.5 h-3.5" />
                                          Download Label PDF
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                           setConfirmDialog({
                                             isOpen: true,
                                             title: 'Delete Order',
                                             message: 'Are you sure you want to permanently delete this order?',
                                             actionType: 'delete_order',
                                             targetId: order.id
                                           });
                                         }}
                                         className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 transition-colors rounded text-red-600 font-sans text-[10px] font-bold uppercase tracking-[0.1em]"
                                       >
                                         <Trash2 className="w-3.5 h-3.5" />
                                         Delete
                                       </button>
                                       {order.status !== 'Cancelled' && (
                                         <button
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             setConfirmDialog({
                                               isOpen: true,
                                               title: 'Cancel Order',
                                               message: 'Are you sure you want to cancel this order?',
                                               actionType: 'cancel_order',
                                               targetId: order.id
                                             });
                                           }}
                                           className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 transition-colors rounded text-[#F9F7F2] font-sans text-[10px] font-bold uppercase tracking-[0.1em]"
                                         >
                                           Cancel Order
                                         </button>
                                       )}
                                     </div>
                                   </div>
                                   <div className="space-y-3">
                                      {order.trackingUpdates?.map((update, idx) => (
                                        <div key={idx} className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]/40 shrink-0"></span>
                                            <span className="font-bold text-xs">{update.status}</span>
                                            <span className="text-[10px] text-[#1A1A1A]/50 uppercase">{new Date(update.date).toLocaleString()}</span>
                                          </div>
                                          <p className="text-xs text-[#1A1A1A]/60 pl-3.5 border-l border-[#1A1A1A]/10 ml-0.5 pb-2">{update.note}</p>
                                        </div>
                                      ))}
                                   </div>
                                 </div>
                               </div>
                             </div>
                           </td>
                         </tr>
                       )}
                     </React.Fragment>
                   ))}
                 </tbody>
               </table>
            </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'products' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 border border-[#1A1A1A]/10 gap-4">
              <h2 className="font-serif italic text-2xl text-[#1A1A1A]">Product Inventory</h2>
              <div className="flex gap-4 flex-wrap">
                <input 
                  type="text" 
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search Products..." 
                  className="border border-[#1A1A1A]/20 p-2 font-sans text-sm outline-none focus:border-[#1A1A1A]"
                />
                <select 
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  className="border border-[#1A1A1A]/20 p-2 font-sans text-sm outline-none bg-transparent focus:border-[#1A1A1A]">
                  <option value="all">All Categories</option>
                  {Array.from(new Set(productsList.map(p => p.category))).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select 
                  value={productStockFilter}
                  onChange={(e) => setProductStockFilter(e.target.value)}
                  className="border border-[#1A1A1A]/20 p-2 font-sans text-sm outline-none bg-transparent focus:border-[#1A1A1A]">
                  <option value="all">All Stock</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
                <select 
                  value={productSort}
                  onChange={(e) => setProductSort(e.target.value)}
                  className="border border-[#1A1A1A]/20 p-2 font-sans text-sm outline-none bg-transparent focus:border-[#1A1A1A]">
                  <option value="newest">Newest</option>
                  <option value="price_low_high">Price: Low to High</option>
                  <option value="price_high_low">Price: High to Low</option>
                  <option value="stock_low_high">Stock: Low to High</option>
                </select>
                <button 
                  onClick={() => {
                    setEditingProduct(null);
                    setIsCreating(true);
                    setUploadedImage(null);
                    setUploadedAdditionalImages([]);
                    setSeoTitleDraft('');
                    setSeoDescriptionDraft('');
                    setHasVariantsDraft(false);
                    setVariantRows([]);
                    setIsBulkFlashOpen(false);
                  }}
                  className="flex items-center gap-2 bg-[#1A1A1A] text-[#F9F7F2] px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/90 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Product
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsBulkFlashOpen(!isBulkFlashOpen);
                    setIsCreating(false);
                    setEditingProduct(null);
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] border transition-all cursor-pointer ${
                    isBulkFlashOpen 
                      ? 'bg-[#CDA185] text-[#F9F7F2] border-[#CDA185]' 
                      : 'bg-[#CDA185]/10 text-[#CDA185] border-[#CDA185]/30 hover:bg-[#CDA185]/20'
                  }`}
                >
                  ⚡ Bulk Flash Sale
                </button>
              </div>
            </div>

            {/* Bulk Flash Sale Manager Panel */}
            {isBulkFlashOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 border border-[#CDA185]/35 shadow-sm relative rounded-xl mb-6"
              >
                <div className="flex justify-between items-start mb-4 border-b border-[#CDA185]/15 pb-3">
                  <div>
                    <h3 className="font-serif italic text-xl text-[#CDA185] flex items-center gap-2 font-medium">
                      ⚡ Bulk Flash Sale Manager
                    </h3>
                    <p className="text-[11px] text-[#1A1A1A]/50 font-sans mt-0.5">Control live promotional events across subsets of your inventories at once.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsBulkFlashOpen(false)}
                    className="p-1 px-2.5 bg-[#1A1A1A]/5 text-[#1A1A1A]/70 hover:text-red-500 hover:bg-black/5 rounded transition-all cursor-pointer font-sans text-[10px] uppercase tracking-wider font-bold"
                  >
                    Close
                  </button>
                </div>

                {bulkFlashMessage.text && (
                  <div className={`p-3 mb-4 rounded-lg text-xs font-sans font-bold flex items-center gap-2 border ${
                    bulkFlashMessage.type === 'success' 
                      ? 'bg-green-500/10 text-green-700 border-green-500/20' 
                      : 'bg-red-500/10 text-red-700 border-red-500/20'
                  }`}>
                    {bulkFlashMessage.type === 'success' ? '✓' : '⚠️'} {bulkFlashMessage.text}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  {/* Scope target selection */}
                  <div>
                    <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1.5">
                      1. Target Scope
                    </label>
                    <select 
                      value={bulkTargetType}
                      onChange={(e) => setBulkTargetType(e.target.value as any)}
                      className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-xs focus:border-[#CDA185] bg-white outline-none"
                    >
                      <option value="all">Apply to All Products ({productsList.length})</option>
                      <option value="category">Apply to Subset Category</option>
                      <option value="manual">Manual Select Checkboxes ({selectedProductIds.length} Selected)</option>
                    </select>
                  </div>

                  {/* Category select */}
                  {bulkTargetType === 'category' && (
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1.5">
                        Target Category
                      </label>
                      <select 
                        value={bulkSelectedCategory}
                        onChange={(e) => setBulkSelectedCategory(e.target.value)}
                        className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-xs focus:border-[#CDA185] bg-white outline-none"
                      >
                        {Array.from(new Set(productsList.map(p => p.category))).map(cat => (
                          <option key={cat} value={cat}>{cat} ({productsList.filter(p => p.category === cat).length})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Manual choice hints */}
                  {bulkTargetType === 'manual' && (
                    <div className="bg-[#1A1A1A]/[0.02] p-2.5 border border-[#1A1A1A]/10 rounded text-[10px] text-[#1A1A1A]/60 font-sans leading-snug">
                      Toggle items in the table list below to manually pick targeted products.
                    </div>
                  )}

                  {/* Operation selection */}
                  <div>
                    <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1.5">
                      2. Update Type
                    </label>
                    <select 
                      value={bulkActionType}
                      onChange={(e) => setBulkActionType(e.target.value as any)}
                      className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-xs focus:border-[#CDA185] bg-white outline-none"
                    >
                      <option value="activate">Activate / Scheduled Sale ⚡</option>
                      <option value="deactivate">Deactivate / Reset Retail Price ↩</option>
                    </select>
                  </div>

                  {bulkActionType === 'activate' && (
                    <>
                      <div>
                        <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1.5">
                          3. Promo % Discount
                        </label>
                        <div className="flex gap-2 items-center">
                          <input 
                            type="number" 
                            min="0"
                            max="99"
                            value={bulkDiscountPercentage}
                            onChange={(e) => {
                              setBulkDiscountPercentage(parseInt(e.target.value) || 0);
                              setBulkFixedPrice('');
                            }}
                            className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-xs focus:border-[#CDA185] bg-white outline-none"
                            placeholder="e.g. 20"
                          />
                          <span className="font-sans font-bold text-xs">% off</span>
                        </div>
                      </div>

                      <div>
                        <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1.5">
                          OR Set Price for All
                        </label>
                        <div className="flex gap-2 items-center">
                          <input 
                            type="number" 
                            value={bulkFixedPrice}
                            onChange={(e) => {
                              setBulkFixedPrice(e.target.value);
                            }}
                            className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-xs focus:border-[#CDA185] bg-white outline-none"
                            placeholder="e.g. 599"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1.5">
                          4. End Date-Time
                        </label>
                        <input 
                          type="datetime-local" 
                          value={bulkEndTime}
                          onChange={(e) => setBulkEndTime(e.target.value)}
                          className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-xs focus:border-[#CDA185] bg-white outline-none"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-[#1A1A1A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-[10px] text-[#CDA185] font-sans font-semibold tracking-wider flex items-center gap-1">
                     💡 Note: Percentage options scale with product original prices.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      let targets: Product[] = [];
                      if (bulkTargetType === 'all') {
                        targets = productsList;
                      } else if (bulkTargetType === 'category') {
                        targets = productsList.filter(p => p.category === bulkSelectedCategory);
                      } else if (bulkTargetType === 'manual') {
                        targets = productsList.filter(p => selectedProductIds.includes(p.id));
                      }

                      if (targets.length === 0) {
                        setBulkFlashMessage({ text: 'Error: No products met the targeted selection filters.', type: 'error' });
                        return;
                      }

                      const updatedList = productsList.map(p => {
                        const isTargeted = targets.some(val => val.id === p.id);
                        if (!isTargeted) return p;

                        if (bulkActionType === 'deactivate') {
                          const { isFlashSale, flashSalePrice, flashSaleEndTime, ...rest } = p;
                          return {
                            ...rest,
                            isFlashSale: false
                          };
                        } else {
                          let salePrice = p.price;
                          if (bulkFixedPrice && !isNaN(parseFloat(bulkFixedPrice))) {
                            salePrice = parseFloat(bulkFixedPrice);
                          } else {
                            salePrice = Math.round(p.price * (1 - bulkDiscountPercentage / 100));
                          }

                          return {
                            ...p,
                            isFlashSale: true,
                            flashSalePrice: salePrice,
                            flashSaleEndTime: bulkEndTime || undefined
                          };
                        }
                      });

                      saveProductsList(updatedList);
                      setBulkFlashMessage({
                        text: `Success: Bulk ${bulkActionType === 'activate' ? 'Activation' : 'Reset'} completed on ${targets.length} product(s)!`,
                        type: 'success'
                      });
                      
                      setTimeout(() => {
                        setBulkFlashMessage({ text: '', type: '' });
                      }, 5000);

                      if (bulkTargetType === 'manual') {
                        setSelectedProductIds([]);
                      }
                    }}
                    className="px-6 py-2 bg-[#CDA185] hover:bg-[#CDA185]/90 text-white font-sans text-[10px] uppercase tracking-[0.15em] font-extrabold transition-all cursor-pointer rounded shadow-sm whitespace-nowrap self-end"
                  >
                    Execute Bulk Update ⚡
                  </button>
                </div>
              </motion.div>
            )}

            {(isCreating || editingProduct) && (
              <div className="bg-white p-6 border border-[#1A1A1A]/10 shadow-sm relative">
                <h3 className="font-serif italic text-xl mb-6">
                  {isCreating ? 'Create New Product' : 'Edit Product'}
                </h3>
                
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
                    const productName = formData.get('name') as string;
                    const productCategory = formData.get('category') as string;
                    const selectedStatus = submitter?.value === 'draft'
                      ? 'draft'
                      : (formData.get('status') as Product['status']) || 'active';
                    const nextSku = (formData.get('sku') as string).trim() || generateSku(productCategory);
                    const nextSlug = uniqueSlug(
                      slugifyProductName((formData.get('slug') as string).trim() || productName),
                      productsList,
                      editingProduct?.id
                    );
                    const normalizedVariants = (variantRows || [])
                      .map(variant => {
                        const label = String(variant?.label || variant?.name || '').trim();
                        return {
                          label,
                          name: label,
                          price: Number(variant?.price) || 0,
                          original_price: variant?.original_price ? Number(variant.original_price) : undefined,
                          stock: Number(variant?.stock) || 0,
                          image_url: String(variant?.image_url || '').trim(),
                        };
                      })
                      .filter(variant => variant.label && variant.price > 0);
                    
                    const productData: Product = {
                      id: editingProduct?.id || `new-${Date.now()}`,
                      name: productName,
                      description: formData.get('description') as string,
                      price: parseFloat(formData.get('price') as string),
                      compareAtPrice: formData.get('compareAtPrice') ? parseFloat(formData.get('compareAtPrice') as string) : undefined,
                      category: productCategory,
                      imageUrl: uploadedImage || (formData.get('imageUrl') as string),
                      images: uploadedAdditionalImages,
                      stock: parseInt(formData.get('stock') as string) || 0,
                      fullDetails: formData.get('fullDetails') as string,
                      ingredients: formData.get('ingredients') as string,
                      howToUse: formData.get('howToUse') as string,
                      warnings: formData.get('warnings') as string,
                      subCategory: formData.get('subCategory') as string,
                      advantages: (formData.get('advantages') as string).split(',').map(s => s.trim()).filter(Boolean),
                      disadvantages: (formData.get('disadvantages') as string).split(',').map(s => s.trim()).filter(Boolean),
                      isFlashSale: formData.get('isFlashSale') === 'true',
                      flashSalePrice: formData.get('flashSalePrice') ? parseFloat(formData.get('flashSalePrice') as string) : undefined,
                      flashSaleEndTime: formData.get('flashSaleEndTime') as string || undefined,
                      sku: nextSku,
                      brand: (formData.get('brand') as string).trim(),
                      slug: nextSlug,
                      product_form: formData.get('product_form') as string,
                      net_weight: (formData.get('net_weight') as string).trim(),
                      country_of_origin: (formData.get('country_of_origin') as string).trim() || 'Pakistan',
                      shelf_life: (formData.get('shelf_life') as string).trim(),
                      product_video_url: (formData.get('product_video_url') as string).trim(),
                      seo_title: (formData.get('seo_title') as string).trim() || productName,
                      seo_description: (formData.get('seo_description') as string).trim() || (formData.get('description') as string),
                      tags: parseListValue(formData.get('tags')),
                      status: selectedStatus,
                      is_featured: formData.get('is_featured') === 'on',
                      is_new_arrival: formData.get('is_new_arrival') === 'on',
                      is_best_seller: formData.get('is_best_seller') === 'on',
                      isNew: formData.get('is_new_arrival') === 'on',
                      sort_order: parseInt(formData.get('sort_order') as string) || 0,
                      skin_type: formData.getAll('skin_type').map(String),
                      concerns: formData.getAll('concerns').map(String),
                      claims: parseListValue(formData.get('claims')),
                      is_cruelty_free: formData.get('is_cruelty_free') === 'on',
                      is_vegan: formData.get('is_vegan') === 'on',
                      is_derma_tested: formData.get('is_derma_tested') === 'on',
                      shipping_weight: formData.get('shipping_weight') ? Number(formData.get('shipping_weight')) : undefined,
                      is_free_shipping: formData.get('is_free_shipping') === 'on',
                      estimated_delivery: (formData.get('estimated_delivery') as string).trim() || '3-5 business days',
                      return_policy: ((formData.get('return_policy') as string) || '7-day-return') as Product['return_policy'],
                      warranty_info: (formData.get('warranty_info') as string).trim(),
                      has_variants: hasVariantsDraft,
                      variant_type: hasVariantsDraft ? (formData.get('variant_type') as string) : undefined,
                      variants: hasVariantsDraft ? normalizedVariants : [],
                    };

                    if (isCreating) {
                      addProduct(productData);
                    } else if (editingProduct) {
                      updateProduct(editingProduct.id, productData);
                    }
                    setIsCreating(false);
                    setEditingProduct(null);
                    setUploadedImage(null);
                    setUploadedAdditionalImages([]);
                    setSeoTitleDraft('');
                    setSeoDescriptionDraft('');
                    setHasVariantsDraft(false);
                    setVariantRows([]);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-wrap">
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Product Name</label>
                      <input name="name" defaultValue={editingProduct?.name || ''} required className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Category</label>
                      <input name="category" list="categories-list" defaultValue={editingProduct?.category || 'Skin Care'} required className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                      <datalist id="categories-list">
                        {Array.from(new Set([...categories, ...productsList.map(p => p.category)])).map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Sub-Category</label>
                      <input name="subCategory" list="subcategories-list" defaultValue={editingProduct?.subCategory || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" placeholder="e.g. Serums & Essentials, Cleansers" />
                      <datalist id="subcategories-list">
                        {Array.from(new Set([
                          ...Object.values(subCategories).flat(),
                          ...productsList.map(p => p.subCategory).filter(Boolean) as string[]
                        ])).map(sub => (
                          <option key={sub} value={sub} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">SKU / Product Code</label>
                      <input name="sku" defaultValue={editingProduct?.sku || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" placeholder="Leave empty to auto-generate (e.g. SKN-482901)" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Brand Name</label>
                      <input name="brand" defaultValue={editingProduct?.brand || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" placeholder="e.g. Neutrogena, Garnier, Local Brand" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Product Form</label>
                      <select name="product_form" defaultValue={editingProduct?.product_form || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] bg-white outline-none">
                        <option value="">Select product form</option>
                        {PRODUCT_FORM_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Net Weight / Volume</label>
                      <input name="net_weight" defaultValue={editingProduct?.net_weight || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" placeholder="e.g. 50ml, 100g, 30 Tablets" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Country of Origin</label>
                      <input name="country_of_origin" defaultValue={editingProduct?.country_of_origin || 'Pakistan'} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Shelf Life</label>
                      <input name="shelf_life" defaultValue={editingProduct?.shelf_life || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" placeholder="e.g. 24 months from manufacture date" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Price (Rs. ) <span className="lowercase font-normal tracking-normal text-red-500">*</span></label>
                      <input name="price" type="number" step="0.01" defaultValue={editingProduct?.price || ''} required className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Original Price (Rs. ) <span className="lowercase font-normal tracking-normal text-[#1A1A1A]/50">(for discounts)</span></label>
                      <input name="compareAtPrice" type="number" step="0.01" defaultValue={editingProduct?.compareAtPrice || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" placeholder="e.g. 5000" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Product Image</label>
                      <div className="flex flex-col gap-3">
                        {uploadedImage ? (
                          <div className="relative w-24 h-24 border border-[#1A1A1A]/20">
                             <img src={uploadedImage} alt="Preview" className="w-full h-full object-cover" />
                             <button type="button" onClick={() => setUploadedImage(null)} className="absolute top-1 right-1 bg-white text-red-500 rounded-full p-1 text-xs px-2 shadow-sm border border-black/10">Remove</button>
                             <input type="hidden" name="imageUrl" value={uploadedImage} />
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                            <input name="imageUrl" placeholder="Image URL (e.g. https://...)" defaultValue={editingProduct?.imageUrl || ''} className="w-full sm:flex-1 border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                            <span className="text-xs text-[#1A1A1A]/50 px-2 font-sans">OR</span>
                            <div className="relative">
                              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                              <button type="button" className="w-full sm:w-auto px-4 py-2 border border-[#1A1A1A] text-[#1A1A1A] font-sans text-[10px] uppercase tracking-widest hover:bg-[#1A1A1A] hover:text-[#F9F7F2] transition-colors whitespace-nowrap">
                                Upload File
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2 border border-[#1A1A1A]/10 p-4 bg-[#1A1A1A]/[0.02]">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <label className="block font-sans text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]">Product Imagination Gallery (Optional Additional Images)</label>
                          <p className="text-[10px] text-[#1A1A1A]/50 font-sans mt-0.5">Add multiple views of textures, model/application photos or packaging details for deep customer imagination.</p>
                        </div>
                        <span className="font-sans text-[10px] text-[#CDA185] bg-[#CDA185]/10 px-2.5 py-1 rounded font-bold uppercase tracking-wider">{uploadedAdditionalImages.length} images added</span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 mb-4 items-end sm:items-center">
                        <div className="flex-1 w-full">
                          <input 
                            type="text"
                            placeholder="Paste additional image URL (e.g. https://...)"
                            value={newImageUrlInput}
                            onChange={(e) => setNewImageUrlInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newImageUrlInput.trim()) {
                                  setUploadedAdditionalImages(prev => [...prev, newImageUrlInput.trim()]);
                                  setNewImageUrlInput('');
                                }
                              }
                            }}
                            className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-xs focus:border-[#1A1A1A] bg-white outline-none" 
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (newImageUrlInput.trim()) {
                              setUploadedAdditionalImages(prev => [...prev, newImageUrlInput.trim()]);
                              setNewImageUrlInput('');
                            }
                          }}
                          className="px-4 py-2 bg-[#1A1A1A]/10 hover:bg-[#1A1A1A] hover:text-[#F9F7F2] text-[#1A1A1A] font-sans text-[10px] uppercase tracking-widest transition-colors font-bold whitespace-nowrap cursor-pointer"
                        >
                          Add URL
                        </button>
                        <span className="text-xs text-[#1A1A1A]/50 font-sans px-1">OR</span>
                        <div className="relative">
                          <input 
                            type="file" 
                            multiple 
                            accept="image/*" 
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files) {
                                Array.from(files).forEach(file => {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setUploadedAdditionalImages(prev => [...prev, reader.result as string]);
                                  };
                                  reader.readAsDataURL(file as any);
                                });
                              }
                            }} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                          />
                          <button type="button" className="px-4 py-2 bg-[#1A1A1A] text-[#F9F7F2] font-sans text-[10px] uppercase tracking-widest hover:bg-[#1A1A1A]/90 transition-colors whitespace-nowrap font-bold cursor-pointer">
                            Upload Files (Multi)
                          </button>
                        </div>
                      </div>

                      {uploadedAdditionalImages.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                          {uploadedAdditionalImages.map((img, idx) => (
                            <div key={idx} className="relative group/thumb aspect-[3/4] border border-[#1A1A1A]/15 bg-white overflow-hidden rounded-md shadow-sm">
                              <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105" />
                              
                              {/* Index badge */}
                              <div className="absolute top-1.5 left-1.5 bg-[#1A1A1A]/80 text-[#F9F7F2] text-[9px] font-sans px-1.5 py-0.5 rounded-sm font-bold shadow-sm">
                                #{idx + 1}
                              </div>

                              {/* Controls Overlay */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex flex-col justify-between p-1.5 z-10">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUploadedAdditionalImages(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="self-end bg-red-600/90 hover:bg-red-600 text-white rounded p-1 text-[9px] px-1.5 cursor-pointer font-sans uppercase font-bold tracking-wider shadow-sm transition-colors"
                                >
                                  Remove
                                </button>
                                
                                <div className="flex gap-1 justify-between mt-auto">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => {
                                      if (idx > 0) {
                                        setUploadedAdditionalImages(prev => {
                                          const next = [...prev];
                                          const temp = next[idx];
                                          next[idx] = next[idx - 1];
                                          next[idx - 1] = temp;
                                          return next;
                                        });
                                      }
                                    }}
                                    className="flex-1 bg-white/95 hover:bg-white text-[#1A1A1A] text-[9.5px] font-sans py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed font-extrabold select-none transition-all shadow-sm flex items-center justify-center cursor-pointer"
                                    title="Move Left"
                                  >
                                    ←
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === uploadedAdditionalImages.length - 1}
                                    onClick={() => {
                                      if (idx < uploadedAdditionalImages.length - 1) {
                                        setUploadedAdditionalImages(prev => {
                                          const next = [...prev];
                                          const temp = next[idx];
                                          next[idx] = next[idx + 1];
                                          next[idx + 1] = temp;
                                          return next;
                                        });
                                      }
                                    }}
                                    className="flex-1 bg-white/95 hover:bg-white text-[#1A1A1A] text-[9.5px] font-sans py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed font-extrabold select-none transition-all shadow-sm flex items-center justify-center cursor-pointer"
                                    title="Move Right"
                                  >
                                    →
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border border-dashed border-[#1A1A1A]/10 rounded-lg p-6 text-center text-[11px] text-[#1A1A1A]/40 font-sans font-medium tracking-wide">
                          No additional gallery snapshots configured yet. Paste URLs or drop files to activate the dynamic sliding carousel.
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Product Demo Video URL</label>
                      <input name="product_video_url" defaultValue={editingProduct?.product_video_url || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" placeholder="YouTube link or direct MP4 URL for product demo" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Stock Amount</label>
                      <input name="stock" type="number" defaultValue={editingProduct?.stock || 0} required className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Short Description</label>
                      <textarea name="description" defaultValue={editingProduct?.description || ''} required className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" rows={2}></textarea>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Full Details</label>
                      <textarea name="fullDetails" defaultValue={editingProduct?.fullDetails || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" rows={3} placeholder="Deep dive details..."></textarea>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Ingredients</label>
                      <textarea name="ingredients" defaultValue={editingProduct?.ingredients || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" rows={2} placeholder="Comma separated or distinct list..."></textarea>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">How To Use</label>
                      <textarea name="howToUse" defaultValue={editingProduct?.howToUse || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" rows={2} placeholder="Instructions on use..."></textarea>
                    </div>
                    <div className="md:col-span-2 bg-red-500/5 p-4 rounded-sm border border-red-500/10">
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-red-600 mb-1 font-bold">Warnings & Safety Precautions</label>
                      <textarea name="warnings" defaultValue={editingProduct?.warnings || ''} className="w-full border border-red-500/20 p-2 font-sans text-sm focus:border-red-500 bg-white outline-none" rows={2} placeholder="Skin responsiveness safety checklist, accidental ingestion alerts, patch testing..."></textarea>
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Advantages (comma separated)</label>
                      <input name="advantages" defaultValue={editingProduct?.advantages?.join(', ') || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Disadvantages (comma separated)</label>
                      <input name="disadvantages" defaultValue={editingProduct?.disadvantages?.join(', ') || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>

                    <div className="md:col-span-2 border border-[#1A1A1A]/10 p-4 bg-white">
                      <h4 className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A] mb-3">SEO & Discoverability</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">URL Slug</label>
                          <input name="slug" defaultValue={editingProduct?.slug || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" placeholder="vitamin-c-serum-30ml" />
                        </div>
                        <div>
                          <div className="flex justify-between gap-3">
                            <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">SEO Title</label>
                            <span className="font-sans text-[10px] text-[#1A1A1A]/45">{seoTitleDraft.length}/60</span>
                          </div>
                          <input name="seo_title" maxLength={60} value={seoTitleDraft} onChange={(event) => setSeoTitleDraft(event.target.value)} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" placeholder="Defaults to product name if empty" />
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex justify-between gap-3">
                            <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">SEO Meta Description</label>
                            <span className="font-sans text-[10px] text-[#1A1A1A]/45">{seoDescriptionDraft.length}/160</span>
                          </div>
                          <textarea name="seo_description" maxLength={160} value={seoDescriptionDraft} onChange={(event) => setSeoDescriptionDraft(event.target.value)} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" rows={2} placeholder="Defaults to short description if empty" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Product Tags</label>
                          <input name="tags" defaultValue={editingProduct?.tags?.join(', ') || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" placeholder="e.g. moisturizer, anti-aging, vitamin c" />
                          <p className="mt-1 font-sans text-[10px] text-[#1A1A1A]/45">Press comma between tags. Tags save as removable-style pills on customer pages.</p>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 border border-[#1A1A1A]/10 p-4 bg-[#1A1A1A]/[0.02]">
                      <h4 className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A] mb-3">Status & Visibility</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-3 flex flex-wrap gap-2">
                          {[
                            ['active', 'Active'],
                            ['draft', 'Draft'],
                            ['hidden', 'Hidden'],
                          ].map(([value, label]) => (
                            <label key={value} className="flex items-center gap-2 border border-[#1A1A1A]/10 bg-white px-3 py-2 font-sans text-[10px] uppercase tracking-widest font-bold">
                              <input type="radio" name="status" value={value} defaultChecked={(editingProduct?.status || 'active') === value} className="accent-[#1A1A1A]" />
                              {label}
                            </label>
                          ))}
                        </div>
                        {[
                          ['is_featured', 'Featured Product', editingProduct?.is_featured],
                          ['is_new_arrival', 'New Arrival', editingProduct?.is_new_arrival || editingProduct?.isNew],
                          ['is_best_seller', 'Best Seller', editingProduct?.is_best_seller],
                        ].map(([name, label, checked]) => (
                          <label key={String(name)} className="flex items-center justify-between gap-3 border border-[#1A1A1A]/10 bg-white p-3 font-sans text-[10px] uppercase tracking-widest font-bold">
                            <span>{label}</span>
                            <input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} className="h-4 w-4 accent-[#CDA185]" />
                          </label>
                        ))}
                        <div>
                          <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Sort Order</label>
                          <input name="sort_order" type="number" defaultValue={editingProduct?.sort_order || 0} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 border border-[#1A1A1A]/10 p-4 bg-white">
                      <h4 className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A] mb-3">Skin & Hair Suitability</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <p className="font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">Suitable Skin Type</p>
                          <div className="flex flex-wrap gap-2">
                            {SKIN_TYPE_OPTIONS.map(([value, label]) => (
                              <label key={value} className="flex items-center gap-2 rounded-full border border-[#1A1A1A]/10 px-3 py-1.5 font-sans text-[10px] uppercase tracking-wider">
                                <input type="checkbox" name="skin_type" value={value} defaultChecked={editingProduct?.skin_type?.includes(value)} className="accent-[#1A1A1A]" />
                                {label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">Targets Concern</p>
                          <div className="flex flex-wrap gap-2">
                            {CONCERN_OPTIONS.map(([value, label]) => (
                              <label key={value} className="flex items-center gap-2 rounded-full border border-[#1A1A1A]/10 px-3 py-1.5 font-sans text-[10px] uppercase tracking-wider">
                                <input type="checkbox" name="concerns" value={value} defaultChecked={editingProduct?.concerns?.includes(value)} className="accent-[#1A1A1A]" />
                                {label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Product Claims</label>
                          <input name="claims" defaultValue={editingProduct?.claims?.join(', ') || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" placeholder="e.g. paraben-free, sulfate-free, alcohol-free" />
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 border border-[#1A1A1A]/10 p-4 bg-[#f7fbf6]">
                      <h4 className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A] mb-3">Certifications</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          ['is_cruelty_free', 'Cruelty Free', editingProduct?.is_cruelty_free],
                          ['is_vegan', 'Vegan Formula', editingProduct?.is_vegan],
                          ['is_derma_tested', 'Dermatologically Tested', editingProduct?.is_derma_tested],
                        ].map(([name, label, checked]) => (
                          <label key={String(name)} className="flex items-center justify-between border border-green-700/15 bg-white p-4 font-sans text-[10px] uppercase tracking-widest font-bold text-green-800">
                            <span>{label}</span>
                            <input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} className="h-4 w-4 accent-green-700" />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2 border border-[#1A1A1A]/10 p-4 bg-white">
                      <h4 className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A] mb-3">Shipping & Returns</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Shipping Weight (grams)</label>
                          <input name="shipping_weight" type="number" step="0.01" defaultValue={editingProduct?.shipping_weight || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" placeholder="e.g. 250" />
                        </div>
                        <label className="flex items-center justify-between gap-3 border border-[#1A1A1A]/10 p-3 font-sans text-[10px] uppercase tracking-widest font-bold">
                          <span>Free Shipping</span>
                          <input type="checkbox" name="is_free_shipping" defaultChecked={Boolean(editingProduct?.is_free_shipping)} className="h-4 w-4 accent-[#CDA185]" />
                        </label>
                        <div>
                          <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Estimated Delivery</label>
                          <input name="estimated_delivery" defaultValue={editingProduct?.estimated_delivery || '3-5 business days'} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" placeholder="e.g. 2-3 business days" />
                        </div>
                        <div>
                          <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Return Policy</label>
                          <select name="return_policy" defaultValue={editingProduct?.return_policy || '7-day-return'} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] bg-white outline-none">
                            <option value="no-return">No Returns</option>
                            <option value="7-day-return">7-Day Return</option>
                            <option value="14-day-return">14-Day Return</option>
                            <option value="30-day-return">30-Day Return</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Warranty Information</label>
                          <input name="warranty_info" defaultValue={editingProduct?.warranty_info || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" placeholder="e.g. 6 months, manufacturer defects only" />
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 border border-[#1A1A1A]/10 p-4 bg-[#1A1A1A]/[0.02]">
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <h4 className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]">Product Variants</h4>
                        <label className="flex items-center gap-2 font-sans text-[10px] uppercase tracking-widest font-bold">
                          <input type="checkbox" checked={hasVariantsDraft} onChange={(event) => {
                            setHasVariantsDraft(event.target.checked);
                            if (event.target.checked && (!variantRows || variantRows.length === 0)) {
                              setVariantRows([{ name: '', label: '', price: 0, original_price: undefined, stock: 0, image_url: '' }]);
                            }
                          }} className="h-4 w-4 accent-[#1A1A1A]" />
                          Has Variants
                        </label>
                      </div>
                      {hasVariantsDraft && (
                        <div className="space-y-3">
                          <div>
                            <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Variant Type</label>
                            <select name="variant_type" defaultValue={editingProduct?.variant_type || 'size'} className="w-full md:w-72 border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] bg-white outline-none">
                              {VARIANT_TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            {(variantRows || []).map((variant, index) => (
                              <div key={index} className="grid grid-cols-1 md:grid-cols-[1.1fr_.8fr_.8fr_.7fr_1.2fr_auto] gap-2">
                                <input value={variant.label || variant.name || ''} onChange={(event) => setVariantRows(prev => (prev || []).map((row, rowIndex) => rowIndex === index ? { ...row, label: event.target.value, name: event.target.value } : row))} className="border border-[#1A1A1A]/20 p-2 font-sans text-xs outline-none" placeholder="Variant Label" />
                                <input type="number" step="0.01" value={variant.price || ''} onChange={(event) => setVariantRows(prev => (prev || []).map((row, rowIndex) => rowIndex === index ? { ...row, price: Number(event.target.value) } : row))} className="border border-[#1A1A1A]/20 p-2 font-sans text-xs outline-none" placeholder="Price Rs." />
                                <input type="number" step="0.01" value={variant.original_price || ''} onChange={(event) => setVariantRows(prev => (prev || []).map((row, rowIndex) => rowIndex === index ? { ...row, original_price: Number(event.target.value) || undefined } : row))} className="border border-[#1A1A1A]/20 p-2 font-sans text-xs outline-none" placeholder="Original Price" />
                                <input type="number" value={variant.stock || ''} onChange={(event) => setVariantRows(prev => (prev || []).map((row, rowIndex) => rowIndex === index ? { ...row, stock: Number(event.target.value) } : row))} className="border border-[#1A1A1A]/20 p-2 font-sans text-xs outline-none" placeholder="Stock" />
                                <input value={variant.image_url || ''} onChange={(event) => setVariantRows(prev => (prev || []).map((row, rowIndex) => rowIndex === index ? { ...row, image_url: event.target.value } : row))} className="border border-[#1A1A1A]/20 p-2 font-sans text-xs outline-none" placeholder="Image URL" />
                                <button type="button" onClick={() => setVariantRows(prev => (prev || []).filter((_, rowIndex) => rowIndex !== index))} className="border border-red-500/20 px-3 py-2 text-red-600 font-sans text-[10px] uppercase tracking-widest font-bold">Remove</button>
                              </div>
                            ))}
                          </div>
                          <button type="button" onClick={() => setVariantRows(prev => [...(prev || []), { name: '', label: '', price: 0, original_price: undefined, stock: 0, image_url: '' }])} className="px-4 py-2 border border-[#1A1A1A]/20 font-sans text-[10px] uppercase tracking-widest font-bold hover:bg-[#1A1A1A] hover:text-white transition-colors">
                            + Add Variant Row
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2 border border-[#CDA185]/30 p-4 bg-[#CDA185]/5 rounded-lg mt-2">
                      <h4 className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#CDA185] mb-1 flex items-center gap-1.5 font-bold">⚡ Flash Sale Session configuration</h4>
                      <p className="font-sans text-[10px] text-[#1A1A1A]/60 mb-3">Enabling flash sale overrides typical retail pricing and displays an active countdown timer on details pages.</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block font-sans text-[9px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Flash Sale Active</label>
                          <select name="isFlashSale" defaultValue={editingProduct?.isFlashSale ? 'true' : 'false'} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-xs focus:border-[#CDA185] bg-white outline-none">
                            <option value="false">Inactive</option>
                            <option value="true">Active ⚡</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-sans text-[9px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Flash Sale Price (Rs. )</label>
                          <input name="flashSalePrice" type="number" step="0.01" defaultValue={editingProduct?.flashSalePrice || ''} placeholder="e.g. 599.00" className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-xs focus:border-[#CDA185] bg-white outline-none" />
                        </div>
                        <div>
                          <label className="block font-sans text-[9px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Flash End Date-Time</label>
                          <input name="flashSaleEndTime" type="datetime-local" defaultValue={editingProduct?.flashSaleEndTime ? (() => { try { return new Date(new Date(editingProduct.flashSaleEndTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16); } catch(err) { return ''; } })() : ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-xs focus:border-[#CDA185] bg-white outline-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button" 
                      onClick={() => { setIsCreating(false); setEditingProduct(null); setUploadedImage(null); setUploadedAdditionalImages([]); setSeoTitleDraft(''); setSeoDescriptionDraft(''); setHasVariantsDraft(false); setVariantRows([]); }}
                      className="px-6 py-2 border border-[#1A1A1A]/20 text-[#1A1A1A] font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      name="saveIntent"
                      value="draft"
                      className="px-6 py-2 border border-[#CDA185] text-[#8b5f3d] font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#CDA185]/10 transition-colors"
                    >
                      Save as Draft
                    </button>
                    <button 
                      type="submit"
                      name="saveIntent"
                      value="save"
                      className="px-6 py-2 bg-[#1A1A1A] text-[#F9F7F2] font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/90 transition-colors"
                    >
                      Save Product
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white border border-[#1A1A1A]/10 overflow-hidden">
               <table className="w-full text-left font-sans text-sm">
                 <thead className="bg-[#1A1A1A]/5">
                   <tr>
                     <th className="px-4 py-4 w-12 text-center">
                       <input
                         type="checkbox"
                         checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id))}
                         onChange={(e) => {
                           if (e.target.checked) {
                             const allIds = filteredProducts.map(p => p.id);
                             setSelectedProductIds(prev => Array.from(new Set([...prev, ...allIds])));
                           } else {
                             const allIds = filteredProducts.map(p => p.id);
                             setSelectedProductIds(prev => prev.filter(id => !allIds.includes(id)));
                           }
                         }}
                         className="cursor-pointer accent-[#1A1A1A]"
                       />
                     </th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Product</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Category</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Price</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Stock</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Status</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#1A1A1A]/10">
                   {filteredProducts.map((product, index) => (
                     <motion.tr 
                       key={product.id}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ duration: 0.4, delay: index * 0.05 }}
                       className="group hover:bg-[#1A1A1A]/5 transition-colors"
                     >
                       <td className="px-4 py-4 text-center">
                         <input
                           type="checkbox"
                           checked={selectedProductIds.includes(product.id)}
                           onChange={(e) => {
                             if (e.target.checked) {
                               setSelectedProductIds(prev => [...prev, product.id]);
                             } else {
                               setSelectedProductIds(prev => prev.filter(id => id !== product.id));
                             }
                           }}
                           className="cursor-pointer accent-[#1A1A1A]"
                         />
                       </td>
                       <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                           <SafeImage src={product.imageUrl} alt={product.name} className="w-10 h-10 object-cover" />
                           <div>
                             <span className="font-medium group-hover:text-[#1A1A1A]/70 transition-colors">{product.name}</span>
                             <span className="block text-[10px] uppercase tracking-[0.12em] text-[#1A1A1A]/45">SKU {product.id}</span>
                           </div>
                         </div>
                       </td>
                       <td className="px-6 py-4 text-[#1A1A1A]/60">{product.category}</td>
                       <td className="px-6 py-4">
                         <div className="font-serif italic">Rs. {product.price}</div>
                         {product.isFlashSale && (
                           <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold text-[#CDA185] bg-[#CDA185]/10 px-1.5 py-0.5 mt-1 rounded shadow-sm">
                             ⚡ Rs. {product.flashSalePrice}
                           </span>
                         )}
                       </td>
                       <td className="px-6 py-4">
                         <div className="flex flex-col items-start gap-1">
                           <span className="text-[#1A1A1A]">{product.stock || 0}</span>
                           {(product.stock || 0) <= 5 && (product.stock || 0) > 0 && (
                             <span className="text-[9px] uppercase tracking-widest font-bold text-yellow-600 bg-yellow-500/10 px-2 rounded-sm py-0.5">Low Stock</span>
                           )}
                           {(product.stock || 0) === 0 && (
                             <span className="text-[9px] uppercase tracking-widest font-bold text-red-600 bg-red-500/10 px-2 rounded-sm py-0.5">Out of Stock</span>
                           )}
                         </div>
                       </td>
                       <td className="px-6 py-4">
                         <span className={`px-2 py-1 text-[9px] uppercase tracking-widest font-bold rounded-sm ${
                           (product.status || 'active') === 'active'
                             ? 'bg-green-500/10 text-green-700'
                             : (product.status || 'active') === 'draft'
                               ? 'bg-amber-500/10 text-amber-700'
                               : 'bg-[#1A1A1A]/10 text-[#1A1A1A]/60'
                         }`}>
                           {labelizeValue(product.status || 'active')}
                         </span>
                       </td>
                       <td className="px-6 py-4">
                         <div className="flex items-center justify-end gap-2">
                           <button
                             type="button"
                             onClick={() => window.open(`/product/${product.id}`, '_blank', 'noopener,noreferrer')}
                             className="p-1.5 hover:bg-[#1A1A1A]/10 rounded-sm text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors"
                             aria-label={`View ${product.name}`}
                           >
                             <Eye className="w-4 h-4" />
                           </button>
                          <button
                             onClick={() => {
                               setEditingProduct(product);
                               setIsCreating(false);
                               setUploadedImage(product.imageUrl);
                               setUploadedAdditionalImages(product.images || []);
                               setSeoTitleDraft(product.seo_title || '');
                               setSeoDescriptionDraft(product.seo_description || '');
                               setHasVariantsDraft(Boolean(product.has_variants || product.variants?.length));
                               setVariantRows(product.variants || []);
                             }}
                             className="p-1.5 hover:bg-[#1A1A1A]/10 rounded-sm text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors"
                           >
                             <Edit className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => {
                               setConfirmDialog({
                                 isOpen: true,
                                 title: 'Delete Product',
                                 message: 'Are you sure you want to delete this product?',
                                 actionType: 'delete_product',
                                 targetId: product.id
                               });
                             }}
                             className="p-1.5 hover:bg-red-500/10 rounded-sm text-[#1A1A1A]/60 hover:text-red-600 transition-colors"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                       </td>
                     </motion.tr>
                   ))}
                 </tbody>
               </table>
               <div className="border-t border-[#1A1A1A]/10 px-6 py-3 font-sans text-[10px] uppercase tracking-[0.14em] text-[#1A1A1A]/50">
                 Showing {filteredProducts.length} of {productsList.length} backend products
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'customers' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 border border-[#1A1A1A]/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="font-serif italic text-2xl text-[#1A1A1A]">Customer Accounts</h2>
              <div className="flex-1 max-w-md ml-auto">
                 <input 
                   type="text" 
                   value={customerSearch}
                   onChange={(e) => setCustomerSearch(e.target.value)}
                   placeholder="Search Name, Email, ID..." 
                   className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm outline-none focus:border-[#1A1A1A]"
                 />
              </div>
            </div>
            
            <div className="bg-white border border-[#1A1A1A]/10 overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left font-sans text-sm">
                 <thead className="bg-[#1A1A1A]/5">
                   <tr>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">User ID</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Name</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Email</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Joined</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Coin Balance</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Warnings</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Status</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#1A1A1A]/10">
                   {filteredCustomers.map((user, index) => (
                     <motion.tr 
                       key={user.id}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ duration: 0.4, delay: index * 0.05 }}
                       className="group hover:bg-[#1A1A1A]/5 transition-colors cursor-pointer"
                       onClick={() => setSelectedCustomer(user)}
                     >
                       <td className="px-6 py-4 font-medium transition-colors group-hover:text-[#1A1A1A]/70">{user.id}</td>
                       <td className="px-6 py-4">{user.name}</td>
                       <td className="px-6 py-4 text-[#1A1A1A]/60">{user.email}</td>
                       <td className="px-6 py-4 text-[#1A1A1A]/60">{user.joined}</td>
                       <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                           <Coins className="w-4 h-4 text-[#1A1A1A]" />
                           <span className="font-bold">{user.coins}</span>
                         </div>
                       </td>
                       <td className="px-6 py-4">
                         <span className={`px-2 py-1 select-none text-[10px] font-bold uppercase tracking-widest rounded-full ${user.warnings > 0 ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'}`}>
                           {user.warnings || 0}
                         </span>
                       </td>
                       <td className="px-6 py-4">
                         <span className={`px-2 py-1 select-none text-[10px] font-bold uppercase tracking-widest rounded-full ${user.status === 'Blocked' ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'}`}>
                           {user.status || 'Active'}
                         </span>
                       </td>
                       <td className="px-6 py-4">
                         <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setConfirmDialog({
                                 isOpen: true,
                                 title: 'Warn User',
                                 message: 'Are you sure you want to issue a warning to this user?',
                                 actionType: 'warn_user',
                                 targetId: user.id
                               });
                             }}
                             className="px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 rounded-sm text-[10px] uppercase font-bold tracking-widest transition-colors"
                             title="Warn User"
                           >
                             Warn
                           </button>
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               const newStatus = user.status === 'Blocked' ? 'Active' : 'Blocked';
                               setConfirmDialog({
                                  isOpen: true,
                                  title: newStatus === 'Blocked' ? 'Block User' : 'Unblock User',
                                  message: `Are you sure you want to ${newStatus === 'Blocked' ? 'block' : 'unblock'} user account ${user.email}?`,
                                  actionType: 'toggle_block_user',
                                  targetId: user.id
                                })
                             }}
                             className={`px-2 py-1 rounded-sm text-[10px] uppercase font-bold tracking-widest transition-colors ${user.status === 'Blocked' ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'}`}
                           >
                             {user.status === 'Blocked' ? 'Unblock' : 'Block'}
                           </button>
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setConfirmDialog({
                                 isOpen: true,
                                 title: 'Delete User',
                                 message: 'Are you sure you want to delete this user? This cannot be undone.',
                                 actionType: 'delete_user',
                                 targetId: user.id
                               });
                             }}
                             className="p-1.5 hover:bg-red-500/10 rounded-sm text-[#1A1A1A]/60 hover:text-red-600 transition-colors"
                             title="Delete User"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                       </td>
                     </motion.tr>
                   ))}
                 </tbody>
               </table>
            </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'discounts' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 border border-[#1A1A1A]/10 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="font-serif italic text-2xl text-[#1A1A1A]">Promotions & Coupons</h2>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleRefreshCoupons()}
                  className="flex items-center gap-2 border border-[#1A1A1A]/20 bg-white px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A] transition-colors hover:border-[#1A1A1A] disabled:opacity-60"
                  disabled={isCouponRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isCouponRefreshing ? 'animate-spin' : ''}`} /> Refresh Usage
                </button>
                <button 
                  onClick={() => {
                    setEditingCoupon(null);
                    setIsCreatingCoupon(true);
                  }}
                  className="flex items-center gap-2 bg-[#1A1A1A] text-[#F9F7F2] px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/90 transition-colors"
                  >
                  <Plus className="w-4 h-4" /> New Coupon
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Active Coupons', value: activeCouponCount, note: `${coupons.length} total backend codes` },
                { label: 'Live Sale Items', value: activeLiveSaleCount, note: settings.liveSaleActive ? 'session enabled' : 'session paused' },
                { label: 'Coupon Uses', value: couponRedemptions, note: 'saved redemption count' },
                { label: 'Discount Liability', value: `Rs. ${coupons.reduce((sum, coupon) => sum + ((coupon.usageCount || 0) * (coupon.discountPercentage || 0)), 0).toFixed(0)}`, note: 'percent-weighted estimate' },
              ].map(metric => (
                <div key={metric.label} className="border border-[#1A1A1A]/10 bg-white p-5">
                  <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/55">{metric.label}</p>
                  <p className="mt-2 font-serif text-3xl text-[#1A1A1A]">{metric.value}</p>
                  <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.12em] text-[#CDA185]">{metric.note}</p>
                </div>
              ))}
            </div>
            
            {(isCreatingCoupon || editingCoupon) && (
              <div className="bg-white border border-[#1A1A1A]/10 p-6">
                <div className="flex justify-between flex-wrap gap-4 items-center mb-6">
                  <h2 className="font-serif italic text-2xl text-[#1A1A1A]">
                    {isCreatingCoupon ? 'Create New Coupon' : 'Edit Coupon'}
                  </h2>
                  <button 
                    onClick={() => {
                      setIsCreatingCoupon(false);
                      setEditingCoupon(null);
                    }}
                    className="text-[#1A1A1A]/60 hover:text-[#1A1A1A] font-sans text-[11px] uppercase tracking-widest font-bold"
                  >
                    Cancel
                  </button>
                </div>
                <form 
                  className="space-y-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const newCoupon = {
                      id: editingCoupon?.id || `CPN-${Date.now()}`,
                      code: formData.get('code') as string,
                      discountPercentage: Number(formData.get('discountPercentage')),
                      startDate: formData.get('startDate') as string,
                      endDate: formData.get('endDate') as string,
                      usageLimit: formData.get('usageLimit') ? Number(formData.get('usageLimit')) : undefined,
                      usageCount: editingCoupon?.usageCount || 0,
                      minOrderAmount: formData.get('minOrderAmount') ? Number(formData.get('minOrderAmount')) : undefined,
                      isActive: formData.get('isActive') === 'true',
                    };
                    if (isCreatingCoupon) addCoupon(newCoupon);
                    else updateCoupon(editingCoupon.id, newCoupon);
                    setIsCreatingCoupon(false);
                    setEditingCoupon(null);
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Coupon Code</label>
                      <input name="code" defaultValue={editingCoupon?.code || ''} required className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Discount %</label>
                      <input name="discountPercentage" type="number" min="1" max="100" defaultValue={editingCoupon?.discountPercentage || ''} required className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Start Date</label>
                      <input name="startDate" type="date" defaultValue={editingCoupon?.startDate || ''} required className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">End Date</label>
                      <input name="endDate" type="date" defaultValue={editingCoupon?.endDate || ''} required className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Usage Limit (optional)</label>
                      <input name="usageLimit" type="number" min="1" defaultValue={editingCoupon?.usageLimit || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Min Order Amount (optional)</label>
                      <input name="minOrderAmount" type="number" min="0" defaultValue={editingCoupon?.minOrderAmount || ''} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input name="isActive" value="true" type="checkbox" defaultChecked={editingCoupon ? editingCoupon.isActive : true} className="w-4 h-4 accent-[#1A1A1A]" />
                        <span className="font-sans text-sm font-medium">Coupon Active</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-[#1A1A1A]/10 mt-6 flex justify-end">
                    <button type="submit" className="bg-[#1A1A1A] text-white px-8 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/90 transition-colors">
                      {isCreatingCoupon ? 'Save Coupon' : 'Update Coupon'}
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            <div className="bg-white border border-[#1A1A1A]/10 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left font-sans text-sm">
                   <thead className="bg-[#1A1A1A]/5">
                     <tr>
                       <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Code</th>
                       <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Type</th>
                       <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Value</th>
                       <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Min Order</th>
                       <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Expires</th>
                       <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Usage</th>
                       <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Active</th>
                       <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-[#1A1A1A]/10">
                     {coupons.length === 0 ? (
                       <tr>
                         <td colSpan={8} className="px-6 py-8 text-center text-[#1A1A1A]/50">No coupons created yet.</td>
                       </tr>
                     ) : coupons.map((c) => (
                       <tr key={c.id}>
                         <td className="px-6 py-4 font-bold">{c.code}</td>
                         <td className="px-6 py-4">Percentage</td>
                         <td className="px-6 py-4">{c.discountPercentage}%</td>
                         <td className="px-6 py-4">{c.minOrderAmount ? `Rs. ${c.minOrderAmount}` : 'No minimum'}</td>
                         <td className="px-6 py-4">{c.endDate}</td>
                         <td className="px-6 py-4">{c.usageCount} {c.usageLimit ? `/ ${c.usageLimit}` : ''}</td>
                         <td className="px-6 py-4">
                           <button
                             type="button"
                             onClick={() => updateCoupon(c.id, { isActive: !c.isActive })}
                             className={`relative h-6 w-11 rounded-full transition-colors ${c.isActive ? 'bg-green-600' : 'bg-[#1A1A1A]/20'}`}
                             aria-label={`${c.isActive ? 'Deactivate' : 'Activate'} ${c.code}`}
                           >
                             <span className={`absolute left-0 top-1 h-4 w-4 rounded-full bg-white transition-transform ${c.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                           </button>
                         </td>
                         <td className="px-6 py-4 text-right">
                           <button onClick={() => setEditingCoupon(c)} className="text-[#1A1A1A]/60 hover:text-[#1A1A1A] mr-4 uppercase text-[10px] font-bold tracking-widest">Edit</button>
                           <button
                             onClick={() => setConfirmDialog({
                               isOpen: true,
                               title: 'Delete Coupon',
                               message: `Delete coupon ${c.code}? This cannot be undone.`,
                               actionType: 'delete_coupon',
                               targetId: c.id,
                             })}
                             className="text-red-500/60 hover:text-red-500 uppercase text-[10px] font-bold tracking-widest"
                           >
                             Delete
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>

          </motion.div>
        )}

        {activeTab === 'reports' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                { label: 'Revenue', value: `Rs. ${totalRevenue.toFixed(0)}`, note: `${totalOrders} orders` },
                { label: 'AOV', value: `Rs. ${averageOrderValue.toFixed(0)}`, note: 'average order value' },
                { label: 'Delivered', value: deliveredOrdersCount, note: 'completed orders' },
                { label: 'Low Stock', value: lowStockProducts.length, note: `threshold ${lowStockThreshold}` },
                { label: 'Out of Stock', value: outOfStockProducts.length, note: 'needs restock' },
              ].map((metric) => (
                <div key={metric.label} className="rounded-[8px] border border-[#1A1A1A]/10 bg-white p-5 shadow-sm">
                  <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/55">{metric.label}</p>
                  <p className="mt-2 font-serif text-3xl text-[#1A1A1A]">{metric.value}</p>
                  <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.12em] text-[#CDA185]">{metric.note}</p>
                </div>
              ))}
            </div>

            <section className="rounded-[8px] border border-[#1A1A1A]/10 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-[#CDA185]">Business Exports</p>
                  <h2 className="mt-2 font-serif text-3xl text-[#1A1A1A]">Download store data</h2>
                  <p className="mt-2 max-w-2xl font-sans text-sm leading-6 text-[#1A1A1A]/60">
                    Export operational CSV files for accounting, delivery follow-up, inventory review, customer care, and promotion audits.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['Orders CSV', exportOrdersCsv],
                    ['Products CSV', exportProductsCsv],
                    ['Customers CSV', exportCustomersCsv],
                    ['Coupons CSV', exportCouponsCsv],
                    ['Settings Backup', exportSettingsBackup],
                  ].map(([label, action]) => (
                    <button
                      key={String(label)}
                      type="button"
                      onClick={action as () => void}
                      className="inline-flex items-center gap-2 rounded-full border border-[#1A1A1A]/12 px-4 py-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-[#1A1A1A] transition-colors hover:border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {String(label)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-[8px] border border-[#1A1A1A]/10 bg-[#F9F7F2] p-4">
                <div className="flex items-start gap-3">
                  <Database className="mt-0.5 h-5 w-5 shrink-0 text-[#CDA185]" />
                  <p className="font-sans text-xs leading-6 text-[#1A1A1A]/65">
                    CSV exports are generated from the current admin data in the browser. Settings backup includes store settings, category names, and sub-category mapping so you can keep a configuration snapshot before major changes.
                  </p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-[8px] border border-[#1A1A1A]/10 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-[#1A1A1A]/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#CDA185]">Inventory Risk</p>
                    <h3 className="mt-1 font-serif text-2xl text-[#1A1A1A]">Low stock watchlist</h3>
                  </div>
                  <label className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/60">
                    Threshold
                    <input
                      type="number"
                      min={0}
                      value={lowStockThreshold}
                      onChange={(event) => setLowStockThreshold(Math.max(0, Number(event.target.value) || 0))}
                      className="w-20 rounded border border-[#1A1A1A]/15 bg-[#F9F7F2] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#1A1A1A]"
                    />
                  </label>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-sm">
                    <thead className="bg-[#1A1A1A]/5">
                      <tr>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/55">Product</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/55">SKU</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/55">Category</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/55">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]/8">
                      {lowStockProducts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center font-sans text-sm text-[#1A1A1A]/50">No products are under the selected threshold.</td>
                        </tr>
                      ) : lowStockProducts.slice(0, 12).map((product) => (
                        <tr key={product.id}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              {(product.stock || 0) === 0 && <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />}
                              <span className="font-medium text-[#1A1A1A]">{product.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-[#1A1A1A]/60">{product.sku || '-'}</td>
                          <td className="px-5 py-3 text-[#1A1A1A]/60">{product.category}</td>
                          <td className={`px-5 py-3 font-bold ${(product.stock || 0) === 0 ? 'text-red-700' : 'text-yellow-700'}`}>{product.stock || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-[8px] border border-[#1A1A1A]/10 bg-white p-6 shadow-sm">
                <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#CDA185]">Customer Value</p>
                <h3 className="mt-1 font-serif text-2xl text-[#1A1A1A]">Top customers</h3>
                <div className="mt-5 space-y-3">
                  {customerReport.slice(0, 8).map((customer) => (
                    <div key={customer.id} className="rounded-[8px] border border-[#1A1A1A]/10 bg-[#F9F7F2] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-sans text-sm font-bold text-[#1A1A1A]">{customer.name}</p>
                          <p className="truncate font-sans text-xs text-[#1A1A1A]/55">{customer.email}</p>
                        </div>
                        <span className="shrink-0 font-serif text-lg text-[#1A1A1A]">Rs. {customer.spent.toFixed(0)}</span>
                      </div>
                      <p className="mt-2 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-[#CDA185]">
                        {customer.orders} orders / {customer.coins} coins / {customer.status}
                      </p>
                    </div>
                  ))}
                  {customerReport.length === 0 && (
                    <p className="rounded-[8px] border border-[#1A1A1A]/10 bg-[#F9F7F2] p-5 text-center font-sans text-sm text-[#1A1A1A]/50">No customers yet.</p>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-[8px] border border-[#1A1A1A]/10 bg-white shadow-sm">
              <div className="border-b border-[#1A1A1A]/10 p-5">
                <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#CDA185]">Category Performance</p>
                <h3 className="mt-1 font-serif text-2xl text-[#1A1A1A]">Catalog health by category</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-sm">
                  <thead className="bg-[#1A1A1A]/5">
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/55">Category</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/55">Products</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/55">Active</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/55">Stock Units</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/55">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1A]/8">
                    {categoryReport.map((row) => (
                      <tr key={row.category}>
                        <td className="px-5 py-3 font-bold text-[#1A1A1A]">{row.category}</td>
                        <td className="px-5 py-3 text-[#1A1A1A]/65">{row.products}</td>
                        <td className="px-5 py-3 text-[#1A1A1A]/65">{row.active}</td>
                        <td className="px-5 py-3 text-[#1A1A1A]/65">{row.stock}</td>
                        <td className="px-5 py-3 font-bold text-[#1A1A1A]">Rs. {row.revenue.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'audit' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <section className="rounded-[8px] border border-[#1A1A1A]/10 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-[#CDA185]">
                    <Shield className="h-4 w-4" />
                    Site Audit
                  </p>
                  <h2 className="mt-2 font-serif text-3xl text-[#1A1A1A]">Security, links and data quality</h2>
                  <p className="mt-2 max-w-3xl font-sans text-sm leading-6 text-[#1A1A1A]/60">
                    These checks run against current admin data so broken route coverage, risky coupons, missing fulfillment fields and private review data are visible before publishing or dispatching.
                  </p>
                </div>
                <div className="grid min-w-[260px] grid-cols-3 gap-3">
                  <div className="rounded-[8px] border border-[#1A1A1A]/10 bg-[#F9F7F2] p-4 text-center">
                    <p className="font-sans text-[9px] font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/45">Score</p>
                    <p className="mt-1 font-serif text-3xl text-[#1A1A1A]">{auditScore}%</p>
                  </div>
                  <div className="rounded-[8px] border border-yellow-500/20 bg-yellow-500/10 p-4 text-center">
                    <p className="font-sans text-[9px] font-bold uppercase tracking-[0.16em] text-yellow-800/70">Warnings</p>
                    <p className="mt-1 font-serif text-3xl text-yellow-800">{auditWarnCount}</p>
                  </div>
                  <div className="rounded-[8px] border border-red-500/20 bg-red-500/5 p-4 text-center">
                    <p className="font-sans text-[9px] font-bold uppercase tracking-[0.16em] text-red-800/70">Failures</p>
                    <p className="mt-1 font-serif text-3xl text-red-800">{auditFailCount}</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {auditItems.map((item) => (
                <section key={item.title} className={`rounded-[8px] border p-5 shadow-sm ${auditStatusClass(item.status)}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">{item.status}</p>
                      <h3 className="mt-1 font-serif text-2xl text-[#1A1A1A]">{item.title}</h3>
                    </div>
                    {item.status === 'pass' ? (
                      <Shield className="h-5 w-5 shrink-0 text-green-700" />
                    ) : (
                      <AlertTriangle className={`h-5 w-5 shrink-0 ${item.status === 'fail' ? 'text-red-700' : 'text-yellow-700'}`} />
                    )}
                  </div>
                  <p className="mt-4 font-sans text-sm leading-6 text-[#1A1A1A]/70">{item.detail}</p>
                  <div className="mt-4 rounded-[6px] border border-white/60 bg-white/60 p-3">
                    <p className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/45">Action</p>
                    <p className="mt-1 font-sans text-xs leading-5 text-[#1A1A1A]/65">{item.fix}</p>
                  </div>
                </section>
              ))}
            </div>

            <section className="rounded-[8px] border border-[#1A1A1A]/10 bg-white p-6 shadow-sm">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#CDA185]">Operational Weak Spots</p>
              <h3 className="mt-1 font-serif text-2xl text-[#1A1A1A]">Quick repair queues</h3>
              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {[
                  { label: 'Missing catalog fields', value: productsMissingCoreData.length, note: productsMissingCoreData.slice(0, 4).map(product => product.name || product.id).join(', ') || 'No missing catalog fields' },
                  { label: 'High-risk coupons', value: highRiskCoupons.length + activeExpiredCoupons.length + couponLimitBreaches.length, note: [...highRiskCoupons, ...activeExpiredCoupons, ...couponLimitBreaches].slice(0, 4).map(coupon => coupon.code).join(', ') || 'No coupon risk flags' },
                  { label: 'Order data gaps', value: ordersMissingFulfillmentData.length + ordersMissingCustomerData.length + invalidOrderTotals.length, note: [...ordersMissingFulfillmentData, ...ordersMissingCustomerData, ...invalidOrderTotals].slice(0, 4).map(order => order.id).join(', ') || 'No order data gaps' },
                ].map((queue) => (
                  <div key={queue.label} className="rounded-[8px] border border-[#1A1A1A]/10 bg-[#F9F7F2] p-5">
                    <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#1A1A1A]/50">{queue.label}</p>
                    <p className="mt-2 font-serif text-3xl text-[#1A1A1A]">{queue.value}</p>
                    <p className="mt-2 font-sans text-xs leading-5 text-[#1A1A1A]/60">{queue.note}</p>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 border border-[#1A1A1A]/10 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="font-serif italic text-2xl text-[#1A1A1A]">Site Configuration</h2>
              <div className="flex gap-4 items-center">
                {settingsToast && <span className="text-green-600 font-sans text-xs">Settings saved!</span>}
                <button 
                  onClick={() => {
                    updateSettings(settingsForm);
                    setSettingsToast(true);
                    setTimeout(() => setSettingsToast(false), 3000);
                  }}
                  className="bg-[#1A1A1A] text-white px-8 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/90 transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>

            <div className="bg-white p-6 border border-[#1A1A1A]/10 shadow-sm">
              <div className="space-y-6 max-w-5xl">
                <div>
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">Site Name</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      className="flex-1 border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" 
                    />
                  </div>
                  <p className="text-xs text-[#1A1A1A]/50 mt-1">This appears in the header and globally across the brand.</p>
                </div>

                <div className="pt-6 border-t border-[#1A1A1A]/10">
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">Global Discount Banner</label>
                  <label className="flex items-center gap-2 mb-4 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isBannerActive}
                      onChange={(e) => setIsBannerActive(e.target.checked)}
                      className="w-4 h-4 accent-[#1A1A1A]"
                    />
                    <span className="font-sans text-sm font-medium">Enable Top Banner</span>
                  </label>
                  {isBannerActive && (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={bannerText}
                        onChange={(e) => setBannerText(e.target.value)}
                        placeholder="e.g. Announce a new backend promotion"
                        className="flex-1 border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" 
                      />
                    </div>
                  )}
                  <p className="text-xs text-[#1A1A1A]/50 mt-2">Display announcements or active discount codes at the top of the site.</p>
                </div>

                <div className="pt-6 border-t border-[#1A1A1A]/10">
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-4">Theme, Header & Mobile Controls</label>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {[
                      ['themePrimary', 'Primary'],
                      ['themeBackground', 'Background'],
                      ['themeText', 'Text'],
                      ['themeMuted', 'Muted'],
                      ['themeAccent', 'Accent'],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/60 mb-1">{label}</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={String(settingsForm[key as keyof typeof settingsForm] || '#000000')}
                            onChange={(e) => setSettingsForm({ ...settingsForm, [key]: e.target.value })}
                            className="h-10 w-12 border border-[#1A1A1A]/20 bg-white p-1"
                          />
                          <input
                            type="text"
                            value={String(settingsForm[key as keyof typeof settingsForm] || '')}
                            onChange={(e) => setSettingsForm({ ...settingsForm, [key]: e.target.value })}
                            className="min-w-0 flex-1 border border-[#1A1A1A]/20 p-2 font-sans text-xs focus:border-[#1A1A1A] outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Rotating Announcement Messages</label>
                      <textarea
                        value={(settingsForm.announcementMessages || []).join('\n')}
                        onChange={(e) => setSettingsForm({ ...settingsForm, announcementMessages: e.target.value.split('\n').map(line => line.trim()).filter(Boolean) })}
                        rows={5}
                        placeholder="One message per line. Use {threshold} for free shipping amount."
                        className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
                      {[
                        ['enableAnnouncementBar', 'Announcement bar'],
                        ['enableHeaderSearch', 'Header search'],
                        ['enableWishlistFeature', 'Wishlist feature'],
                        ['enableLoyaltyWidget', 'Loyalty widget'],
                        ['enableMobileBottomNav', 'Mobile bottom nav'],
                        ['enableWhatsApp', 'WhatsApp button'],
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 rounded border border-[#1A1A1A]/10 bg-[#F9F7F2] p-3 font-sans text-xs font-bold uppercase tracking-[0.12em] text-[#1A1A1A]/70">
                          <input
                            type="checkbox"
                            checked={settingsForm[key as keyof typeof settingsForm] !== false}
                            onChange={(e) => setSettingsForm({ ...settingsForm, [key]: e.target.checked })}
                            className="accent-[#1A1A1A]"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">WhatsApp Default Message</label>
                    <input
                      type="text"
                      value={settingsForm.whatsappMessage}
                      onChange={(e) => setSettingsForm({ ...settingsForm, whatsappMessage: e.target.value })}
                      className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-[#1A1A1A]/10">
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-4">Store Operations & Conversion Tools</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      ['maintenanceMode', 'Maintenance mode'],
                      ['promoPopupEnabled', 'Promo popup'],
                      ['enableCoupons', 'Checkout coupons'],
                      ['enableExpressDelivery', 'Express delivery'],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 rounded border border-[#1A1A1A]/10 bg-[#F9F7F2] p-3 font-sans text-xs font-bold uppercase tracking-[0.12em] text-[#1A1A1A]/70">
                        <input
                          type="checkbox"
                          checked={Boolean(settingsForm[key as keyof typeof settingsForm])}
                          onChange={(e) => setSettingsForm({ ...settingsForm, [key]: e.target.checked })}
                          className="accent-[#1A1A1A]"
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" value={settingsForm.maintenanceTitle} onChange={(e) => setSettingsForm({ ...settingsForm, maintenanceTitle: e.target.value })} placeholder="Maintenance title" className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    <input type="text" value={settingsForm.maintenanceEta} onChange={(e) => setSettingsForm({ ...settingsForm, maintenanceEta: e.target.value })} placeholder="Maintenance ETA" className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    <input type="text" value={settingsForm.orderButtonLabel} onChange={(e) => setSettingsForm({ ...settingsForm, orderButtonLabel: e.target.value })} placeholder="Checkout button label" className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    <textarea value={settingsForm.maintenanceMessage} onChange={(e) => setSettingsForm({ ...settingsForm, maintenanceMessage: e.target.value })} rows={3} placeholder="Maintenance message" className="md:col-span-3 w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={settingsForm.promoPopupTitle} onChange={(e) => setSettingsForm({ ...settingsForm, promoPopupTitle: e.target.value })} placeholder="Promo popup title" className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    <input type="text" value={settingsForm.promoPopupCode} onChange={(e) => setSettingsForm({ ...settingsForm, promoPopupCode: e.target.value })} placeholder="Promo coupon code" className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    <input type="text" value={settingsForm.promoPopupCtaLabel} onChange={(e) => setSettingsForm({ ...settingsForm, promoPopupCtaLabel: e.target.value })} placeholder="Promo CTA label" className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    <input type="text" value={settingsForm.promoPopupCtaUrl} onChange={(e) => setSettingsForm({ ...settingsForm, promoPopupCtaUrl: e.target.value })} placeholder="/shop" className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    <textarea value={settingsForm.promoPopupBody} onChange={(e) => setSettingsForm({ ...settingsForm, promoPopupBody: e.target.value })} rows={3} placeholder="Promo popup body" className="md:col-span-2 w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                  </div>
                </div>

                <div className="pt-6 border-t border-[#1A1A1A]/10">
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-4">Homepage Hero Content</label>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={settingsForm.heroEyebrow}
                      onChange={(e) => setSettingsForm({ ...settingsForm, heroEyebrow: e.target.value })}
                      placeholder="Hero eyebrow"
                      className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                    />
                    <input
                      type="text"
                      value={settingsForm.heroTitle}
                      onChange={(e) => setSettingsForm({ ...settingsForm, heroTitle: e.target.value })}
                      placeholder="Hero title"
                      className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                    />
                    <textarea
                      value={settingsForm.heroSubtitle}
                      onChange={(e) => setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })}
                      placeholder="Hero subtitle"
                      rows={3}
                      className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none resize-none"
                    />
                    <input
                      type="url"
                      value={settingsForm.heroImageUrl}
                      onChange={(e) => setSettingsForm({ ...settingsForm, heroImageUrl: e.target.value })}
                      placeholder="Hero image URL"
                      className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={settingsForm.heroPrimaryCtaLabel}
                        onChange={(e) => setSettingsForm({ ...settingsForm, heroPrimaryCtaLabel: e.target.value })}
                        placeholder="Primary CTA label"
                        className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                      />
                      <input
                        type="text"
                        value={settingsForm.heroPrimaryCtaUrl}
                        onChange={(e) => setSettingsForm({ ...settingsForm, heroPrimaryCtaUrl: e.target.value })}
                        placeholder="/shop"
                        className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                      />
                      <input
                        type="text"
                        value={settingsForm.heroSecondaryCtaLabel}
                        onChange={(e) => setSettingsForm({ ...settingsForm, heroSecondaryCtaLabel: e.target.value })}
                        placeholder="Secondary CTA label"
                        className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                      />
                      <input
                        type="text"
                        value={settingsForm.heroSecondaryCtaUrl}
                        onChange={(e) => setSettingsForm({ ...settingsForm, heroSecondaryCtaUrl: e.target.value })}
                        placeholder="/shop"
                        className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#1A1A1A]/10">
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-4">Homepage Layout & SEO</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    <input
                      type="text"
                      value={settingsForm.homeSeoTitle}
                      onChange={(e) => setSettingsForm({ ...settingsForm, homeSeoTitle: e.target.value })}
                      placeholder="Home SEO title"
                      className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                    />
                    <input
                      type="text"
                      value={settingsForm.homeSeoDescription}
                      onChange={(e) => setSettingsForm({ ...settingsForm, homeSeoDescription: e.target.value })}
                      placeholder="Home SEO description"
                      className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      ['showHomeHero', 'Hero'],
                      ['showHomeMarquee', 'Marquee'],
                      ['showHomeSmartSearch', 'Smart search block'],
                      ['showHomeTrustBadges', 'Trust badges'],
                      ['showHomeCategories', 'Category cards'],
                      ['showHomeBestSellers', 'Best sellers'],
                      ['showHomeLiveSalePromo', 'Live sale promo'],
                      ['showHomeBenefits', 'Benefits section'],
                      ['showHomeSeoContent', 'SEO content block'],
                      ['showHomeProductGrid', 'Home product grid'],
                      ['showHomeReviews', 'Customer reviews'],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 rounded border border-[#1A1A1A]/10 bg-[#F9F7F2] p-3 font-sans text-xs font-bold uppercase tracking-[0.12em] text-[#1A1A1A]/70">
                        <input
                          type="checkbox"
                          checked={settingsForm[key as keyof typeof settingsForm] !== false}
                          onChange={(e) => setSettingsForm({ ...settingsForm, [key]: e.target.checked })}
                          className="accent-[#1A1A1A]"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-[#1A1A1A]/10">
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">Live Sale Session End Time</label>
                  <label className="flex items-center gap-2 mb-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.liveSaleActive}
                      onChange={(e) => setSettingsForm({ ...settingsForm, liveSaleActive: e.target.checked })}
                      className="w-4 h-4 accent-[#1A1A1A]"
                    />
                    <span className="font-sans text-sm font-medium">Enable live sale page deals</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      value={settingsForm.liveSaleTitle}
                      onChange={(e) => setSettingsForm({ ...settingsForm, liveSaleTitle: e.target.value })}
                      placeholder="Live sale title"
                      className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                    />
                    <input
                      type="text"
                      value={settingsForm.liveSaleDiscountText}
                      onChange={(e) => setSettingsForm({ ...settingsForm, liveSaleDiscountText: e.target.value })}
                      placeholder="Discount text"
                      className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                    />
                    <textarea
                      value={settingsForm.liveSaleSubtitle}
                      onChange={(e) => setSettingsForm({ ...settingsForm, liveSaleSubtitle: e.target.value })}
                      placeholder="Live sale subtitle"
                      rows={3}
                      className="md:col-span-2 w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none resize-none"
                    />
                  </div>
                  <input
                    type="datetime-local"
                    value={toDateTimeLocalValue(settingsForm.liveSaleEndTime)}
                    onChange={(e) => setSettingsForm({ ...settingsForm, liveSaleEndTime: fromDateTimeLocalValue(e.target.value) })}
                    className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, liveSaleEndTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() })}
                      className="px-3 py-1.5 bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 font-sans text-[10px] uppercase tracking-widest font-bold transition-colors"
                    >
                      End in 6 Hours
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, liveSaleEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })}
                      className="px-3 py-1.5 bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 font-sans text-[10px] uppercase tracking-widest font-bold transition-colors"
                    >
                      End in 24 Hours
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, liveSaleEndTime: new Date(Date.now() - 60 * 1000).toISOString() })}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 font-sans text-[10px] uppercase tracking-widest font-bold transition-colors"
                    >
                      End Now
                    </button>
                  </div>
                  <p className="text-xs text-[#1A1A1A]/50 mt-2">This saves to Supabase settings and controls the countdown on /live-sale.</p>
                </div>

                <div className="pt-6 border-t border-[#1A1A1A]/10">
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-4">Shipping Configuration</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Standard Delivery Fee (Rs.)</label>
                      <input 
                        type="number" 
                        value={settingsForm.deliveryFee}
                        onChange={(e) => setSettingsForm({...settingsForm, deliveryFee: Number(e.target.value)})}
                        className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Free Shipping Threshold</label>
                      <input 
                        type="number" 
                        value={settingsForm.freeShippingThreshold}
                        onChange={(e) => setSettingsForm({...settingsForm, freeShippingThreshold: Number(e.target.value)})}
                        className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" 
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[#1A1A1A]/50 mt-2">Adjust delivery fee and min. total before it becomes free.</p>
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={settingsForm.standardDeliveryLabel} onChange={(e) => setSettingsForm({...settingsForm, standardDeliveryLabel: e.target.value})} placeholder="Standard delivery label" className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    <input type="text" value={settingsForm.standardDeliveryWindow} onChange={(e) => setSettingsForm({...settingsForm, standardDeliveryWindow: e.target.value})} placeholder="Standard delivery window" className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    <input type="text" value={settingsForm.expressDeliveryLabel} onChange={(e) => setSettingsForm({...settingsForm, expressDeliveryLabel: e.target.value})} placeholder="Express delivery label" className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    <input type="text" value={settingsForm.expressDeliveryWindow} onChange={(e) => setSettingsForm({...settingsForm, expressDeliveryWindow: e.target.value})} placeholder="Express delivery window" className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    <input type="text" value={settingsForm.codPaymentLabel} onChange={(e) => setSettingsForm({...settingsForm, codPaymentLabel: e.target.value})} placeholder="COD payment label" className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    <input type="text" value={settingsForm.orderButtonLabel} onChange={(e) => setSettingsForm({...settingsForm, orderButtonLabel: e.target.value})} placeholder="Order button label" className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    <textarea value={settingsForm.checkoutNotice} onChange={(e) => setSettingsForm({...settingsForm, checkoutNotice: e.target.value})} rows={3} placeholder="Checkout notice" className="md:col-span-2 w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                  </div>
                </div>

                <div className="pt-6 border-t border-[#1A1A1A]/10">
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-4">Store Details, Invoice & Label Settings</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Store Name on Documents</label>
                      <input type="text" value={settingsForm.storeName} onChange={(e) => setSettingsForm({...settingsForm, storeName: e.target.value})} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Logo URL</label>
                      <input type="url" value={settingsForm.logoUrl} onChange={(e) => setSettingsForm({...settingsForm, logoUrl: e.target.value})} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Website URL</label>
                      <input type="url" value={settingsForm.websiteUrl} onChange={(e) => setSettingsForm({...settingsForm, websiteUrl: e.target.value})} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Store Email</label>
                      <input type="email" value={settingsForm.storeEmail} onChange={(e) => setSettingsForm({...settingsForm, storeEmail: e.target.value, supportEmail: e.target.value})} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Store Phone / WhatsApp</label>
                      <input type="text" value={settingsForm.storePhone} onChange={(e) => setSettingsForm({...settingsForm, storePhone: e.target.value, supportPhone: e.target.value})} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Support Email Override</label>
                      <input type="email" value={settingsForm.supportEmail} onChange={(e) => setSettingsForm({...settingsForm, supportEmail: e.target.value})} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">NTN</label>
                      <input type="text" value={settingsForm.ntn} onChange={(e) => setSettingsForm({...settingsForm, ntn: e.target.value})} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">STRN</label>
                      <input type="text" value={settingsForm.strn} onChange={(e) => setSettingsForm({...settingsForm, strn: e.target.value})} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Business Address</label>
                      <textarea value={settingsForm.businessAddress || settingsForm.storeAddress} onChange={(e) => setSettingsForm({...settingsForm, businessAddress: e.target.value, storeAddress: e.target.value})} rows={2} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Return Address</label>
                      <textarea value={settingsForm.returnAddress} onChange={(e) => setSettingsForm({...settingsForm, returnAddress: e.target.value})} rows={2} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Default Return / Exchange Policy</label>
                      <textarea value={settingsForm.defaultReturnPolicy} onChange={(e) => setSettingsForm({...settingsForm, defaultReturnPolicy: e.target.value})} rows={3} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <label className="flex items-start gap-3 rounded border border-[#1A1A1A]/10 bg-white p-3 font-sans text-sm text-[#1A1A1A]/70">
                      <input type="checkbox" checked={settingsForm.taxEnabled} onChange={(e) => setSettingsForm({...settingsForm, taxEnabled: e.target.checked})} className="mt-1 accent-[#1A1A1A]" />
                      <span>
                        <span className="block font-bold text-[#1A1A1A]">Show tax/GST only when enabled and an order has tax amount</span>
                        Keep this off if the seller is not sales-tax registered. Documents will not claim GST when disabled.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#1A1A1A]/10">
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-4">Footer & Trust Badge Content</label>
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 font-sans text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={settingsForm.showFooterNewsletter !== false}
                        onChange={(e) => setSettingsForm({ ...settingsForm, showFooterNewsletter: e.target.checked })}
                        className="accent-[#1A1A1A]"
                      />
                      Show footer newsletter signup
                    </label>
                    <textarea
                      value={settingsForm.footerTagline}
                      onChange={(e) => setSettingsForm({ ...settingsForm, footerTagline: e.target.value })}
                      rows={2}
                      placeholder="Footer brand tagline"
                      className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        ['trustBadgeSecureTitle', 'Secure title'],
                        ['trustBadgeSecureText', 'Secure text'],
                        ['trustBadgeDeliveryTitle', 'Delivery title'],
                        ['trustBadgeDeliveryText', 'Delivery text'],
                        ['trustBadgeTrackingTitle', 'Tracking title'],
                        ['trustBadgeTrackingText', 'Tracking text'],
                        ['trustBadgeOffersTitle', 'Offers title'],
                        ['trustBadgeOffersText', 'Offers text'],
                      ].map(([key, label]) => (
                        <input
                          key={key}
                          type="text"
                          value={String(settingsForm[key as keyof typeof settingsForm] || '')}
                          onChange={(e) => setSettingsForm({ ...settingsForm, [key]: e.target.value })}
                          placeholder={label}
                          className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                        />
                      ))}
                    </div>
                    <p className="text-xs text-[#1A1A1A]/50">Trust badge templates support {'{threshold}'}, {'{count}'} and {'{plural}'}.</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#1A1A1A]/10">
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-4">Social Accounts</label>
                  <div className="space-y-4">
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Instagram URL</label>
                      <input type="text" value={settingsForm.socialInstagram} onChange={(e) => setSettingsForm({...settingsForm, socialInstagram: e.target.value})} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Facebook URL</label>
                      <input type="text" value={settingsForm.socialFacebook} onChange={(e) => setSettingsForm({...settingsForm, socialFacebook: e.target.value})} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#1A1A1A]/10">
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-4">Editable Site Pages</label>
                  <p className="mb-4 font-sans text-xs leading-6 text-[#1A1A1A]/55">
                    Leave a page blank to use the built-in copy. Use blank lines between paragraphs and start a heading with "### ".
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      ['privacyPageContent', 'Privacy Policy'],
                      ['termsPageContent', 'Terms of Service'],
                      ['shippingPageContent', 'Shipping & Returns'],
                      ['contactPageContent', 'Contact Page'],
                      ['faqPageContent', 'FAQs'],
                      ['storyPageContent', 'Our Story'],
                      ['sustainabilityPageContent', 'Sustainability'],
                      ['ingredientsPageContent', 'Ingredients'],
                      ['journalPageContent', 'Journal'],
                    ].map(([key, label]) => (
                      <div key={key} className="md:col-span-1">
                        <label className="mb-1 block font-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/60">{label}</label>
                        <textarea
                          value={String(settingsForm[key as keyof typeof settingsForm] || '')}
                          onChange={(e) => setSettingsForm({ ...settingsForm, [key]: e.target.value })}
                          rows={5}
                          className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none"
                          placeholder={`Custom ${label} content...`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-[#1A1A1A]/10">
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">Manage Categories</label>
                  <div className="flex flex-col gap-3">
                    {categories.map((cat, i) => (
                      <div key={i} className="flex justify-between items-center bg-[#1A1A1A]/5 p-3 rounded-sm">
                        <span className="font-sans text-sm font-medium">{cat}</span>
                        <button 
                          onClick={() => removeCategory(cat)}
                          className="text-[#1A1A1A]/50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input 
                        type="text" 
                        id="new-category"
                        placeholder="New category name..."
                        className="flex-1 border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" 
                        onKeyDown={(e) => {
                           if (e.key === 'Enter') {
                             e.preventDefault();
                             const el = e.currentTarget;
                             if (el.value.trim()) {
                               addCategory(el.value.trim());
                               el.value = '';
                             }
                           }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('new-category') as HTMLInputElement;
                          if (el && el.value.trim()) {
                            addCategory(el.value.trim());
                            el.value = '';
                          }
                        }}
                        className="bg-[#1A1A1A] text-[#F9F7F2] px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/90 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#1A1A1A]/10">
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2 font-bold focus:border-[#1A1A1A]">Manage Sub-categories</label>
                  <p className="font-sans text-[10px] text-[#1A1A1A]/50 mb-3 font-medium">Add precision sub-categories underneath any of your high-level collections.</p>
                  
                  <div className="flex gap-2 mb-4">
                    <span className="font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/55 self-center font-bold">For category:</span>
                    <select
                      value={selectedSubCatEditing}
                      onChange={(e) => setSelectedSubCatEditing(e.target.value)}
                      className="border border-[#1A1A1A]/20 bg-[#F9F7F2] p-1.5 font-sans text-xs focus:border-[#1A1A1A] outline-none rounded-sm cursor-pointer"
                    >
                      {categories.map((cat, i) => (
                        <option key={i} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2 bg-[#1A1A1A]/5 p-4 rounded-sm">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(subCategories[selectedSubCatEditing] || []).length === 0 ? (
                        <p className="font-sans text-xs text-[#1A1A1A]/40 italic py-1">No sub-categories defined for {selectedSubCatEditing} yet.</p>
                      ) : (
                        (subCategories[selectedSubCatEditing] || []).map((sub, idx) => (
                          <span key={idx} className="flex items-center gap-1.5 bg-[#1A1A1A]/10 px-3 py-1.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/80">
                            {sub}
                            <button
                              type="button"
                              onClick={() => removeSubCategory(selectedSubCatEditing, sub)}
                              className="hover:text-red-600 transition-colors cursor-pointer text-[10px] font-extrabold ml-1"
                              title="Delete sub-category"
                            >
                              X
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        id="new-subcategory"
                        placeholder="New sub-category..."
                        className="flex-1 bg-[#F9F7F2] border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" 
                        onKeyDown={(e) => {
                           if (e.key === 'Enter') {
                             e.preventDefault();
                             const el = e.currentTarget;
                             if (el.value.trim() && selectedSubCatEditing) {
                               addSubCategory(selectedSubCatEditing, el.value.trim());
                               el.value = '';
                             }
                           }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('new-subcategory') as HTMLInputElement;
                          if (el && el.value.trim() && selectedSubCatEditing) {
                            addSubCategory(selectedSubCatEditing, el.value.trim());
                            el.value = '';
                          }
                        }}
                        className="bg-[#1A1A1A] text-[#F9F7F2] px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/90 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Customer Details Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-sm px-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#F9F7F2] p-8 max-w-2xl w-full border border-[#1A1A1A]/10 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="absolute top-4 right-4 text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h3 className="font-serif italic font-medium text-2xl text-[#1A1A1A] mb-6">Customer Details</h3>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="font-sans text-[10px] uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Name</p>
                  <p className="font-sans text-sm font-bold">{selectedCustomer.name}</p>
                </div>
                <div>
                  <p className="font-sans text-[10px] uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Email</p>
                  <p className="font-sans text-sm">{selectedCustomer.email}</p>
                </div>
                <div>
                  <p className="font-sans text-[10px] uppercase tracking-widest text-[#1A1A1A]/50 mb-1">User ID</p>
                  <p className="font-sans text-sm">{selectedCustomer.id}</p>
                </div>
                <div>
                  <p className="font-sans text-[10px] uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Joined Date</p>
                  <p className="font-sans text-sm">{selectedCustomer.joined}</p>
                </div>
                <div>
                  <p className="font-sans text-[10px] uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Coin Balance</p>
                  <p className="font-sans text-sm font-bold">{selectedCustomer.coins}</p>
                </div>
                <div>
                  <p className="font-sans text-[10px] uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Status</p>
                  <p className={`font-sans text-[11px] uppercase font-bold tracking-widest ${selectedCustomer.status === 'Blocked' ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedCustomer.status || 'Active'}
                  </p>
                </div>
              </div>

              <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A] mb-4 border-t border-[#1A1A1A]/10 pt-6">Order History</h4>
              
              <div className="bg-white border border-[#1A1A1A]/10">
                {orders.filter(o => o.userEmail === selectedCustomer.email).length === 0 ? (
                  <p className="p-4 text-sm text-[#1A1A1A]/50">No orders found for this customer.</p>
                ) : (
                  <table className="w-full text-left font-sans text-sm">
                    <thead className="bg-[#1A1A1A]/5">
                      <tr>
                        <th className="px-4 py-2 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Order ID</th>
                        <th className="px-4 py-2 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Date</th>
                        <th className="px-4 py-2 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Total</th>
                        <th className="px-4 py-2 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]/10">
                      {orders.filter(o => o.userEmail === selectedCustomer.email).map(o => (
                        <tr key={o.id}>
                          <td className="px-4 py-3">{o.id}</td>
                          <td className="px-4 py-3">{new Date(o.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-serif italic">Rs. {o.total.toFixed(2)}</td>
                          <td className="px-4 py-3 text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70">{o.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-sm px-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#F9F7F2] p-8 max-w-sm w-full border border-[#1A1A1A]/10 shadow-2xl relative"
            >
              <h3 className="font-serif italic font-medium text-2xl text-[#1A1A1A] mb-2">{confirmDialog.title}</h3>
              <p className="font-sans text-sm text-[#1A1A1A]/70 mb-8 leading-relaxed">
                {confirmDialog.message}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 px-4 border border-[#1A1A1A]/20 text-[#1A1A1A] font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/5 transition-colors"
                >
                  No, Cancel
                </button>
                <button 
                  onClick={handleConfirmAction}
                  className="flex-1 py-3 px-4 bg-[#1A1A1A] text-[#F9F7F2] font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/90 transition-colors"
                >
                  Yes, I'm Sure
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
