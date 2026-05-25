import React, { useState } from 'react';
import { Users, ShoppingBag, Coins, BarChart3, Shield, Key, Package, Edit, Plus, Trash2, ChevronDown, ChevronUp, FileText, Eye, EyeOff, X } from 'lucide-react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useProducts } from '../ProductContext';
import { useOrders } from '../OrderContext';
import { useLoyalty } from '../LoyaltyContext';
import { useSite } from '../SiteContext';
import { Product, OrderStatus } from '../types';
import jsPDF from 'jspdf';
import { SafeImage } from '../components/SafeImage';
import { useUI } from '../UIContext';

export function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('aura_admin_auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'customers' | 'products' | 'discounts' | 'settings'>('dashboard');
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'cancel_order' | 'delete_order' | 'delete_user' | 'warn_user' | 'toggle_block_user' | 'delete_product' | null;
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
    }
    
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };
  
  const { productsList, addProduct, updateProduct, deleteProduct, saveProductsList } = useProducts();
  const { orders, updateOrderStatus, updateOrder, deleteOrder } = useOrders();
  const { 
    siteName, setSiteName, bannerText, setBannerText, isBannerActive, setIsBannerActive, 
    couponCode, setCouponCode, couponDiscount, setCouponDiscount, 
    coupons, addCoupon, updateCoupon, deleteCoupon,
    settings, updateSettings,
    categories, addCategory, removeCategory,
    subCategories, addSubCategory, removeSubCategory,
    users, deleteUser, updateUser, warnUser 
  } = useSite();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedSubCatEditing, setSelectedSubCatEditing] = useState<string>('Skin Care');
  const [isCreating, setIsCreating] = useState(false);
  const [uploadedAdditionalImages, setUploadedAdditionalImages] = useState<string[]>([]);
  const [newImageUrlInput, setNewImageUrlInput] = useState('');
  
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
  
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productStockFilter, setProductStockFilter] = useState('all');
  
  const [orderSort, setOrderSort] = useState('newest');
  const [productSort, setProductSort] = useState('newest');

  const { addCoins } = useLoyalty();
  const { addToast } = useUI();

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

  const handleStatusChange = (orderId: string, currentStatus: OrderStatus, newStatus: OrderStatus, coinsEarned: number, coinsAdded?: boolean) => {
    let markCoinsAdded = coinsAdded;
    if (!coinsAdded && (newStatus === 'Shipped' || newStatus === 'Delivered')) {
      addCoins(coinsEarned);
      markCoinsAdded = true;
    }

    if (newStatus === 'Delivered' && currentStatus !== 'Delivered') {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setTimeout(() => {
          addToast(`Email receipt sent to ${order.userEmail} for Order #${order.id}.`, 'info');
        }, 300);
      }
    }

    updateOrderStatus(orderId, newStatus, undefined, markCoinsAdded);
  };

  const handleBulkStatusChange = (newStatus: OrderStatus) => {
    if (selectedOrders.length === 0) return;
    selectedOrders.forEach(orderId => {
      const order = orders.find(o => o.id === orderId);
      if (order && order.status !== newStatus) {
        handleStatusChange(order.id, order.status, newStatus, order.coinsEarned, order.coinsAdded);
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
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.id));
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

  // NOTE: This is a front-end simulation credentials gate for CMS preview testing.
  // In production, replaces these lines with backend secure session headers and server cookies.
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const validPassword = (import.meta as any).env?.VITE_ADMIN_PASSWORD || 'admin123';
    if (password === validPassword) {
      setIsAuthenticated(true);
      localStorage.setItem('aura_admin_auth', 'true');
    } else {
      setLoginError('Invalid access password string. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center bg-[#F9F7F2] p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 md:p-12 max-w-md w-full shadow-lg border border-[#1A1A1A]/10 text-center rounded-2xl"
        >
          <div className="w-16 h-16 bg-[#1A1A1A]/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-[#CDA185]" />
          </div>
          <h1 className="font-serif italic text-3xl mb-1 text-[#1A1A1A]">Admin Console</h1>
          <p className="font-sans text-xs uppercase tracking-widest text-[#CDA185] font-bold mb-6">Aabnoor Management Studio</p>
          <p className="font-sans text-xs text-[#1A1A1A]/60 leading-relaxed mb-6">
            Authentication required. Use the demo password <strong>admin123</strong> for testing store parameters.
          </p>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-md mb-6 font-bold text-center">
              ⚠️ {loginError}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-6 text-left">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/50 mb-2">
                Secure Access Certificate
              </label>
              <div className="relative border-b border-[#1A1A1A]/20 focus-within:border-[#1A1A1A] transition-colors pb-1">
                <Key className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password (e.g., admin123)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent py-2 pl-8 pr-10 font-sans text-sm outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-[#1A1A1A]/5 rounded-sm transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-[#1A1A1A]/50" />
                  ) : (
                    <Eye className="w-4 h-4 text-[#1A1A1A]/50" />
                  )}
                </button>
              </div>
            </div>
            
            <button 
              type="submit"
              className="w-full h-12 bg-[#1A1A1A] text-[#F9F7F2] font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#CDA185] transition-all rounded-full shadow-sm cursor-pointer mt-4"
            >
              Authenticate
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const generateInvoice = (order: typeof orders[0]) => {
    // Generate a beautiful, modern receipt (using A5 size for better layout)
    const doc = new jsPDF({ format: 'a5' }); 
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // --- Dark Header Block ---
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    const m = 15; // horizontal margin
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(siteName || 'Aabnoor', m, 20);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    // Sub-title
    doc.text('Smart Shopping. Better Living.', m, 26);
    
    // Receipt text
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RECEIPT', pageWidth - m, 22, { align: 'right' });
    
    // --- Order & Billed To Section ---
    let yPos = 45;
    const splitCol = pageWidth / 2 + 5;
    
    // Left: Order Info
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('ORDER NUMBER', m, yPos);
    
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.text(order.id.toUpperCase(), m, yPos + 5);
    
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7);
    doc.text('DATE', m, yPos + 14);
    
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(order.date).toLocaleString(), m, yPos + 19);
    
    // Right: Customer Info
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLED TO', splitCol, yPos);
    
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.text(order.userName || 'Guest', splitCol, yPos + 5);
    
    let addressStr = order.shippingAddress || '';
    const emailMatch = addressStr.match(/Email:\s*([^\n]+)/);
    let emailFound = emailMatch ? emailMatch[1] : (order.userEmail || '');
    const phoneMatch = addressStr.match(/Phone:\s*([^\n]+)/);
    let phoneFound = phoneMatch ? phoneMatch[1] : '';
    
    // Remove phone and email from the raw address string to clean it up
    let addressClean = addressStr.replace(/Phone:\s*[^\n]+/, '').replace(/Email:\s*[^\n]+/, '').trim();
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    let currentYRight = yPos + 10;
    
    if (emailFound) {
       doc.text(emailFound, splitCol, currentYRight);
       currentYRight += 5;
    }
    
    if (phoneFound) {
       doc.setFont('helvetica', 'bold');
       doc.text(`Phone:`, splitCol, currentYRight);
       doc.setFont('helvetica', 'normal');
       doc.text(phoneFound, splitCol + 11, currentYRight);
       currentYRight += 5;
    }
    
    if (addressClean) {
       // Constrain text to fit the right half of the page
       const addrLines = doc.splitTextToSize(addressClean, (pageWidth - splitCol) - m);
       doc.text(addrLines, splitCol, currentYRight);
       currentYRight += addrLines.length * 5;
    }
    
    // Ensure table draws below both the left and right columns!
    yPos = Math.max(yPos + 25, currentYRight + 8);
    
    // --- Table Header ---
    doc.setFillColor(245, 245, 245);
    doc.rect(m, yPos, pageWidth - (m * 2), 8, 'F');
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', m + 3, yPos + 5.5);
    doc.text('QTY', pageWidth - 35, yPos + 5.5, { align: 'center' });
    doc.text('TOTAL', pageWidth - m - 3, yPos + 5.5, { align: 'right' });
    
    yPos += 12;
    
    // --- Table Rows ---
    order.items.forEach((item) => {
      const product = productsList.find(p => p.id === item.productId || item.productId.startsWith(p.id));
      const categoryName = product?.category || 'General';

      const splitName = doc.splitTextToSize(item.name, pageWidth - 60);
      const rowHeight = splitName.length * 5 + 3;
      
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(splitName, m + 3, yPos);
      
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`Category: ${categoryName}`, m + 3, yPos + (splitName.length * 4) + 1);
      
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      doc.text(`${item.quantity}`, pageWidth - 35, yPos, { align: 'center' });
      doc.text(`Rs. ${(item.price * item.quantity).toFixed(2)}`, pageWidth - m - 3, yPos, { align: 'right' });
      
      yPos += rowHeight;
      
      // subtle line between items
      doc.setDrawColor(240, 240, 240);
      doc.line(m, yPos, pageWidth - m, yPos);
      yPos += 5;
    });
    
    yPos += 4;
    
    // --- Totals Section ---
    const totalsLeft = pageWidth - 65;
    
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal', totalsLeft, yPos);
    doc.setTextColor(30, 30, 30);
    doc.text(`Rs. ${order.total.toFixed(2)}`, pageWidth - m - 3, yPos, { align: 'right' });
    
    yPos += 6;
    doc.setTextColor(120, 120, 120);
    doc.text('Tax (0%)', totalsLeft, yPos);
    doc.setTextColor(30, 30, 30);
    doc.text('Rs. 0.00', pageWidth - m - 3, yPos, { align: 'right' });
    
    yPos += 8;
    // Bold separator for total
    doc.setDrawColor(200, 200, 200);
    doc.line(totalsLeft, yPos - 5, pageWidth - m - 3, yPos - 5);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Total', totalsLeft, yPos);
    doc.text(`Rs. ${order.total.toFixed(2)}`, pageWidth - m - 3, yPos, { align: 'right' });
    
    // --- Footer ---
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Thank you for shopping with ${siteName || 'Aabnoor'}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text(`Order generated on ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    doc.save(`Receipt-${order.id.slice(0, 8)}.pdf`);
  };

  const generateShippingLabel = (order: typeof orders[0]) => {
    // Standard a5 packet label template 
    const doc = new jsPDF({ format: 'a5' }); 
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const m = 12; // margins
    
    // Physical packaging border line details
    doc.setDrawColor(26, 26, 26);
    doc.setLineWidth(1.5);
    doc.rect(m, m, pageWidth - m * 2, pageHeight - m * 2);
    
    doc.setLineWidth(0.6);
    doc.line(m, 42, pageWidth - m, 42);
    
    // Header Label info
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AABNOOR PRIORITY SHIPPING POST', m + 6, 24);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('EXPRESS FIRST-CLASS AIRWAY BILL / COMPLIMENTARY TRACKING', m + 6, 32);
    
    // Indication Postal stamp box
    doc.rect(pageWidth - m - 46, m + 6, 40, 22);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('POSTAGE PAID', pageWidth - m - 42, m + 13);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('AABNOOR MODERN BRANDS INC', pageWidth - m - 42, m + 19);
    doc.text('LICENSE #07492-MUM', pageWidth - m - 42, m + 24);

    // Return Sender info
    let yPos = 54;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('SENDER / RETURN ADDRESS:', m + 8, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text('AABNOOR MODERNE LOGISTICS COMPLEX B', m + 8, yPos + 5);
    doc.text('DISTRIBUTION ROW 4A, OCHLA IND.', m + 8, yPos + 9);
    doc.text('NEW DELHI IN, 110020', m + 8, yPos + 13);

    // Separator line
    doc.line(m, yPos + 18, pageWidth - m, yPos + 18);

    // Delivery Recipient info
    yPos = 84;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DELIVER / SHIP TO:', m + 12, yPos);
    
    doc.setFontSize(13);
    doc.text((order.userName || 'Boutique Client').toUpperCase(), m + 12, yPos + 8);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const addressLines = doc.splitTextToSize(order.shippingAddress || 'No shipping address provided.', pageWidth - m * 2 - 24);
    doc.text(addressLines, m + 12, yPos + 16);

    // Barcode zone separator line
    const barcodeY = pageHeight - m - 40;
    doc.line(m, barcodeY - 5, pageWidth - m, barcodeY - 5);

    // Generate beautiful thick-thin vectors simulating industrial barcode lines 
    doc.setFillColor(26, 26, 26);
    const barcodeX = m + 15;
    const barcodeWidth = pageWidth - m * 2 - 30;
    const barHeight = 16;
    
    for (let i = 0; i < barcodeWidth; i += 3) {
      // Deterministically configure thick vs thin barcode strips 
      const barThickness = (i % 9 === 0) ? 2 : ((i % 15 === 0) ? 3 : ((i % 6 === 0) ? 1.2 : 0.6));
      doc.rect(barcodeX + i, barcodeY, barThickness, barHeight, 'F');
    }
    
    // Barcode text numbers beneath
    doc.setFontSize(8.5);
    doc.setFont('monospace', 'normal');
    doc.text(`*(H) ${order.id.toUpperCase().slice(0, 15)}*`, pageWidth / 2, barcodeY + barHeight + 6, { align: 'center' });

    doc.save(`Shipping-Label-${order.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="font-serif italic text-4xl mb-2 text-[#1A1A1A]">Admin Console</h1>
            <p className="font-sans text-sm text-[#1A1A1A]/60">Manage orders, users, and loyalty ledger.</p>
          </div>
          
          <div className="flex gap-2 bg-white border border-[#1A1A1A]/10 p-1 rounded-sm overflow-x-auto relative z-0">
            {['dashboard', 'orders', 'products', 'customers', 'discounts', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`relative px-6 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-colors ${activeTab === tab ? 'text-[#F9F7F2]' : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A]'}`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="adminTab"
                    className="absolute inset-0 bg-[#1A1A1A] rounded-sm"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    style={{ zIndex: -1 }}
                  />
                )}
                <span className="relative z-10 capitalize">{tab}</span>
              </button>
            ))}
            <button
              onClick={() => {
                setIsAuthenticated(false);
                localStorage.removeItem('aura_admin_auth');
              }}
              className="relative px-6 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-colors text-red-500/80 hover:text-red-500 border-l border-[#1A1A1A]/10 ml-2"
            >
              Logout
            </button>
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
                <h3 className="font-serif italic text-3xl text-yellow-600">{orders.filter(o => o.status === 'Pending').length}</h3>
              </div>

              <div className="bg-white p-6 border border-[#1A1A1A]/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-green-500/10 rounded-sm">
                    <ShoppingBag className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/60 mb-1">Delivered Orders</p>
                <h3 className="font-serif italic text-3xl text-green-600">{orders.filter(o => o.status === 'Delivered').length}</h3>
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
                <h3 className="font-serif italic text-3xl text-red-500">{productsList.filter(p => (p.stock || 0) < 5).length}</h3>
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
                    <span className="font-serif italic text-lg text-[#1A1A1A]">Rs. 2490.00</span>
                    <span className="text-[8px] text-green-700 block uppercase font-bold mt-0.5">↑ +8.4% Season Yield</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-[#CDA185] font-bold">Loyalty Redemptions</span>
                    <span className="font-serif italic text-lg text-[#1A1A1A]">124 Coupons Unlocked</span>
                    <span className="text-[8px] text-green-700 block uppercase font-bold mt-0.5">↑ 34% Campaign CTR</span>
                  </div>
                </div>

                {/* Popular Codes Checklist */}
                <div>
                  <h4 className="font-sans text-[9px] font-bold uppercase tracking-[0.1em] text-[#1A1A1A]/60 mb-2 border-b border-[#1A1A1A]/5 pb-1">Current Promotion Metrics Checklist</h4>
                  <div className="space-y-2.5">
                    {[
                      { code: 'WELCOME10', discount: '10% OFF', redemptions: 48, savings: 'Rs. 9120.00', status: 'Active Campaign' },
                      { code: 'GLOW25', discount: '25% Custom OFF', redemptions: 34, savings: 'Rs. 15480.00', status: 'Newsletter VIP' },
                      { code: 'SILK35', discount: 'Rs. 350.00 Flat OFF', redemptions: 19, savings: 'Rs. 6650.00', status: 'VIP Mystery' },
                      { code: 'AURAFREE', discount: 'Free Serum on Rs. 1200.00', redemptions: 12, savings: 'Rs. 4800.00', status: 'First Purchase' }
                    ].map((promo, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs font-sans pb-2 border-b border-[#1A1A1A]/5 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            defaultChecked
                            className="accent-[#CDA185] rounded cursor-pointer"
                          />
                          <div>
                            <span className="font-mono font-bold text-[#1A1A1A] bg-[#1A1A1A]/5 px-1.5 py-0.5 rounded mr-1.5 text-[10px]">{promo.code}</span>
                            <span className="text-[#1A1A1A]/40 text-[9px] uppercase tracking-wider">({promo.discount})</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#1A1A1A] text-[11px] block">{promo.savings} saved</span>
                          <span className="text-[8px] text-[#CDA185] uppercase tracking-widest font-bold">({promo.redemptions} Redemptions)</span>
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
                  {[...orders].slice(0,3).map(order => (
                    <div key={order.id} className="flex gap-4 items-start">
                      <div className="w-2 h-2 rounded-full bg-[#1A1A1A] mt-2"></div>
                      <div>
                        <p className="font-sans text-sm text-[#1A1A1A]"><span className="font-bold">{order.userName || order.userEmail}</span> placed an order ({order.id})</p>
                        <p className="font-sans text-xs text-[#1A1A1A]/60 mt-1">Earned {order.coinsEarned} Aabnoor Coins • {new Date(order.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-4 items-start">
                    <div className="w-2 h-2 rounded-full bg-[#1A1A1A]/40 mt-2"></div>
                    <div>
                      <p className="font-sans text-sm text-[#1A1A1A]"><span className="font-bold">alice.w@example.com</span> redeemed 85 Aabnoor Coins</p>
                      <p className="font-sans text-xs text-[#1A1A1A]/60 mt-1">For Product: The Cleanser • 2026-05-19</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
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
                  {(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as OrderStatus[]).map(status => (
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
                         checked={selectedOrders.length === orders.length && orders.length > 0}
                         onChange={toggleAllOrders}
                       />
                     </th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Order ID</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Customer</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Date</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Total</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Coins Earned</th>
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
                           </div>
                         </td>
                         <td className="px-6 py-4 text-[#1A1A1A]/60">{new Date(order.date).toLocaleDateString()}</td>
                         <td className="px-6 py-4 font-serif italic">Rs. {order.total.toFixed(2)}</td>
                         <td className="px-6 py-4 flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-[#1A1A1A]/60"/> {order.coinsEarned}</td>
                         <td className="px-6 py-4">
                           <select
                             value={order.status}
                             onClick={(e) => e.stopPropagation()}
                             onChange={(e) => handleStatusChange(order.id, order.status, e.target.value as OrderStatus, order.coinsEarned, order.coinsAdded)}
                             className="bg-transparent border border-[#1A1A1A]/20 px-2 py-1 text-[10px] uppercase font-bold tracking-[0.1em] text-[#1A1A1A] rounded outline-none cursor-pointer focus:border-[#1A1A1A]"
                           >
                             <option value="Pending">Pending</option>
                             <option value="Processing">Processing</option>
                             <option value="Shipped">Shipped</option>
                             <option value="Delivered">Delivered</option>
                             <option value="Cancelled">Cancelled</option>
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
                                     <div className="flex items-center gap-2">
                                       <button 
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           generateInvoice(order);
                                         }}
                                         className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 transition-colors rounded text-[#1A1A1A] font-sans text-[10px] font-bold uppercase tracking-[0.1em]"
                                        >
                                          <FileText className="w-3.5 h-3.5" />
                                          Invoice
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            generateShippingLabel(order);
                                          }}
                                          className="flex items-center gap-2 px-3 py-1.5 bg-[#CDA185]/10 hover:bg-[#CDA185]/25 transition-colors rounded text-[#CDA185] font-sans text-[10px] font-bold uppercase tracking-[0.1em] cursor-pointer"
                                        >
                                          <Package className="w-3.5 h-3.5" />
                                          Shipping Label
                                        </button>
                                        <button
                                          className="hidden"
                                       >
                                         <FileText className="w-3.5 h-3.5" />
                                         Invoice
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
                    
                    const productData: Product = {
                      id: editingProduct?.id || `new-${Date.now()}`,
                      name: formData.get('name') as string,
                      description: formData.get('description') as string,
                      price: parseFloat(formData.get('price') as string),
                      compareAtPrice: formData.get('compareAtPrice') ? parseFloat(formData.get('compareAtPrice') as string) : undefined,
                      category: formData.get('category') as string,
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
                      onClick={() => { setIsCreating(false); setEditingProduct(null); setUploadedImage(null); setUploadedAdditionalImages([]); }}
                      className="px-6 py-2 border border-[#1A1A1A]/20 text-[#1A1A1A] font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
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
                     {bulkTargetType === 'manual' && isBulkFlashOpen && (
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
                           className="cursor-pointer"
                         />
                       </th>
                     )}
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Product</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Category</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Price</th>
                     <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Stock</th>
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
                       {bulkTargetType === 'manual' && isBulkFlashOpen && (
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
                             className="cursor-pointer"
                           />
                         </td>
                       )}
                       <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                           <img src={product.imageUrl} alt={product.name} className="w-10 h-10 object-cover" />
                           <span className="font-medium group-hover:text-[#1A1A1A]/70 transition-colors">{product.name}</span>
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
                         <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => { setEditingProduct(product); setIsCreating(false); setUploadedImage(product.imageUrl); setUploadedAdditionalImages(product.images || []); }}
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
              <h2 className="font-serif italic text-2xl text-[#1A1A1A]">Discounts & Coupons</h2>
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
                       <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Discount</th>
                       <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Dates</th>
                       <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Usage</th>
                       <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60">Status</th>
                       <th className="px-6 py-4 font-bold uppercase tracking-[0.1em] text-[10px] text-[#1A1A1A]/60 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-[#1A1A1A]/10">
                     {coupons.length === 0 ? (
                       <tr>
                         <td colSpan={6} className="px-6 py-8 text-center text-[#1A1A1A]/50">No coupons created yet.</td>
                       </tr>
                     ) : coupons.map((c) => (
                       <tr key={c.id}>
                         <td className="px-6 py-4 font-bold">{c.code}</td>
                         <td className="px-6 py-4">{c.discountPercentage}%</td>
                         <td className="px-6 py-4">{c.startDate} to {c.endDate}</td>
                         <td className="px-6 py-4">{c.usageCount} {c.usageLimit ? `/ ${c.usageLimit}` : ''}</td>
                         <td className="px-6 py-4">
                           <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-widest ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                             {c.isActive ? 'Active' : 'Inactive'}
                           </span>
                         </td>
                         <td className="px-6 py-4 text-right">
                           <button onClick={() => setEditingCoupon(c)} className="text-[#1A1A1A]/60 hover:text-[#1A1A1A] mr-4 uppercase text-[10px] font-bold tracking-widest">Edit</button>
                           <button onClick={() => {
                             if(confirm('Delete this coupon?')) {
                               deleteCoupon(c.id);
                             }
                           }} className="text-red-500/60 hover:text-red-500 uppercase text-[10px] font-bold tracking-widest">Delete</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>

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
              <div className="space-y-6 max-w-xl">
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
                        placeholder="e.g. Use code WELCOME10 for 10% off your first order"
                        className="flex-1 border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" 
                      />
                    </div>
                  )}
                  <p className="text-xs text-[#1A1A1A]/50 mt-2">Display announcements or active discount codes at the top of the site.</p>
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
                </div>

                <div className="pt-6 border-t border-[#1A1A1A]/10">
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-4">Store Details & Contact</label>
                  <div className="space-y-4">
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Store Email</label>
                      <input type="email" value={settingsForm.storeEmail} onChange={(e) => setSettingsForm({...settingsForm, storeEmail: e.target.value})} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Store Phone</label>
                      <input type="text" value={settingsForm.storePhone} onChange={(e) => setSettingsForm({...settingsForm, storePhone: e.target.value})} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-1">Store Address</label>
                      <input type="text" value={settingsForm.storeAddress} onChange={(e) => setSettingsForm({...settingsForm, storeAddress: e.target.value})} className="w-full border border-[#1A1A1A]/20 p-2 font-sans text-sm focus:border-[#1A1A1A] outline-none" />
                    </div>
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
                              ✕
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
