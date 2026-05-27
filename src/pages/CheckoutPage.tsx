import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, CheckCircle, ShoppingBag, ChevronDown, ChevronUp, CreditCard, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '../CartContext';
import { useOrders } from '../OrderContext';
import { useSite } from '../SiteContext';
import { useNavigate, Link } from 'react-router-dom';
import { SafeImage } from '../components/SafeImage';
import { useUI } from '../UIContext';
import { supabase } from '../lib/supabase';

export function CheckoutPage() {
  const { items, cartTotal, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const { coupons, settings, currentUser, loginDiscountUsed, setLoginDiscountUsed } = useSite();
  const { setIsLoginOpen, addToast } = useUI();
  const navigate = useNavigate();

  const [checkoutStep, setCheckoutStep] = useState<'details' | 'complete'>('details');
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express'>('standard');

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState('');

  const firstTimeDiscountEligible = currentUser && !loginDiscountUsed;
  const firstTimeDiscountAmount = firstTimeDiscountEligible ? 10 : 0;

  const effectiveDiscount = appliedCoupon ? appliedCoupon.discountPercentage : firstTimeDiscountAmount;
  const deliveryFee = cartTotal >= settings.freeShippingThreshold ? 0 : (deliveryMethod === 'express' ? settings.deliveryFee + 100 : settings.deliveryFee);

  const subtotalAfterDiscount = (appliedCoupon || firstTimeDiscountEligible) ? cartTotal * (1 - effectiveDiscount / 100) : cartTotal;
  const finalTotal = subtotalAfterDiscount + deliveryFee;
  const coinsToEarn = Math.floor(finalTotal / 10);
  const deliveryWindow = deliveryMethod === 'express' ? '1-2 business days' : '3-5 business days';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [home, setHome] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'cod'>('credit_card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // If cart is empty and not completed, go home
    if (items.length === 0 && checkoutStep !== 'complete') {
      navigate('/');
    }
  }, [items, checkoutStep, navigate]);

  useEffect(() => {
    const savedDetails = localStorage.getItem('aura_checkout_details');
    if (savedDetails) {
      try {
        const parsed = JSON.parse(savedDetails);
        if (parsed.name) setName(parsed.name);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.home) setHome(parsed.home);
        if (parsed.state) setState(parsed.state);
        if (parsed.country) setCountry(parsed.country);
        if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
      } catch (e) {
        // failed to parse
      }
    }
  }, []);

  const hasDiscount = items.some(item => item.quantity >= 5);

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    const found = coupons.find(c => c.code.toUpperCase() === couponInput.trim().toUpperCase() && c.isActive);
    if (found) {
      if (found.minOrderAmount && cartTotal < found.minOrderAmount) {
        setCouponError(`Minimum order amount is Rs. ${Number(found.minOrderAmount).toFixed(2)}`);
      } else {
        setAppliedCoupon(found);
        setCouponError('');
      }
    } else {
      setCouponError('Invalid or inactive coupon code');
    }
  };

  const handleCheckout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) {
      setIsLoginOpen(true);
      return;
    }
    setIsProcessing(true);
    
    const formData = new FormData(e.currentTarget);
    const formName = (formData.get('name') as string) || '';
    const formEmail = currentUser;
    const formPhone = (formData.get('phone') as string) || '';
    const formHome = (formData.get('home') as string) || '';
    const formState = (formData.get('state') as string) || '';
    const formCountry = (formData.get('country') as string) || '';
    
    const formattedAddress = `${formHome}\n${formState}, ${formCountry}\nPhone: ${formPhone}${formEmail ? `\nEmail: ${formEmail}` : ''}`;
    
    localStorage.setItem('aura_checkout_details', JSON.stringify({
      name: formName, 
      email: formEmail, 
      phone: formPhone, 
      home: formHome, 
      state: formState, 
      country: formCountry, 
      paymentMethod
    }));
    
    await new Promise(resolve => setTimeout(resolve, 800));

    let newOrder;
    try {
      newOrder = await placeOrder({
        userEmail: formEmail,
        userName: formName || formEmail.split('@')[0],
        items: items.map(i => ({ productId: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        total: finalTotal,
        coinsEarned: coinsToEarn,
        shippingAddress: formattedAddress,
        paymentMethod: paymentMethod === 'credit_card' ? 'Credit Card' : 'Cash on Delivery',
      });
    } catch {
      addToast('Order could not be saved. Please try again.', 'error');
      setIsProcessing(false);
      return;
    }

    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token;
        if (!token) return;

        fetch('/api/send-order-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId: newOrder.id }),
        }).catch(() => {
          // Order completion should not fail if the email provider is temporarily unavailable.
        });
      });
    }
    
    setCompletedOrder(newOrder);

    if (firstTimeDiscountEligible) {
      setLoginDiscountUsed(true);
    }

    setEarnedCoins(coinsToEarn);
    clearCart();
    setCheckoutStep('complete');
    window.scrollTo(0, 0);
    setIsProcessing(false);
  };

  if (checkoutStep === 'complete') {
    return (
      <div className="pt-32 pb-24 max-w-2xl mx-auto px-6 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="w-full"
        >
          <div className="w-16 h-16 bg-[#1A1A1A] text-[#F9F7F2] rounded-full flex items-center justify-center mb-6 mx-auto">
             <Coins className="w-8 h-8" />
          </div>
          <h2 className="font-serif italic text-4xl text-[#1A1A1A] mb-4">Order Complete</h2>
          <p className="text-[#1A1A1A]/70 font-sans text-sm mb-2">Thank you for your purchase.</p>
          {completedOrder?.trackingNumber && (
            <div className="mb-6 bg-[#1A1A1A]/5 p-4 inline-block mt-4 rounded">
               <p className="font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/60 mb-1">Your Tracking Number</p>
               <p className="font-sans text-xl font-bold tracking-widest text-[#1A1A1A]">{completedOrder.trackingNumber}</p>
               <p className="font-sans text-xs text-[#1A1A1A]/60 mt-1">A confirmation has been sent to your email.</p>
            </div>
          )}
          <br/>
          <p className="text-[#1A1A1A] font-sans text-[11px] font-bold uppercase tracking-[0.2em] mb-8 mt-2">
            You'll earn {earnedCoins} Aabnoor Coins once shipped
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/track" className="inline-block bg-[#1A1A1A] text-[#F9F7F2] px-8 py-3 rounded-full font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/90 transition-colors">
              Track Order
            </Link>
            <Link to="/" className="inline-block bg-[#1A1A1A]/5 text-[#1A1A1A] px-8 py-3 rounded-full font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/10 transition-colors">
              Continue Shopping
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-24 lg:pt-32 pb-24 max-w-7xl mx-auto px-6 min-h-screen">
      <div className="flex items-center gap-4 mb-4 text-[#1A1A1A]/50 font-sans text-[10px] uppercase font-bold tracking-[0.2em]">
        <span className="text-[#1A1A1A]">1. DETAILS</span>
        <span className="w-8 h-px bg-[#1A1A1A]/20"></span>
        <span className={checkoutStep === 'complete' ? 'text-[#1A1A1A]' : ''}>2. CONFIRMATION</span>
      </div>
      <h1 className="font-serif italic text-4xl text-[#1A1A1A] mb-12">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
        {/* Left Side: Delivery Details Form */}
        <div className="lg:col-span-7">
          <form id="checkout-form" onSubmit={handleCheckout} className="space-y-8">
            <div className="space-y-6">
              <h3 className="font-sans text-xs uppercase font-bold tracking-widest text-[#1A1A1A] border-b border-[#1A1A1A]/10 pb-4">Contact Details</h3>
              <div>
                <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">Full Name <span className="lowercase font-normal text-red-500 tracking-normal">*</span></label>
                <input 
                  type="text"
                  name="name"
                  required
                  defaultValue={name}
                  className="w-full border border-[#1A1A1A]/20 p-3 font-sans text-sm focus:border-[#1A1A1A] outline-none bg-transparent" 
                />
              </div>
              <div>
                <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">Email <span className="lowercase font-normal opacity-70 tracking-normal">(optional)</span></label>
                <input 
                  type="email"
                  name="email"
                  defaultValue={email}
                  className="w-full border border-[#1A1A1A]/20 p-3 font-sans text-sm focus:border-[#1A1A1A] outline-none bg-transparent" 
                />
              </div>
              <div>
                <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">Phone <span className="lowercase font-normal text-red-500 tracking-normal">*</span></label>
                <input 
                  type="tel"
                  name="phone"
                  required
                  defaultValue={phone}
                  className="w-full border border-[#1A1A1A]/20 p-3 font-sans text-sm focus:border-[#1A1A1A] outline-none bg-transparent" 
                />
              </div>

              <h3 className="font-sans text-xs uppercase font-bold tracking-widest text-[#1A1A1A] border-b border-[#1A1A1A]/10 pb-4 mt-12">Shipping Address</h3>
              <div>
                <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">Home / Street Address <span className="lowercase font-normal text-red-500 tracking-normal">*</span></label>
                <input 
                  type="text"
                  name="home"
                  required
                  defaultValue={home}
                  className="w-full border border-[#1A1A1A]/20 p-3 font-sans text-sm focus:border-[#1A1A1A] outline-none bg-transparent" 
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">State <span className="lowercase font-normal text-red-500 tracking-normal">*</span></label>
                  <input 
                    type="text"
                    name="state"
                    required
                    defaultValue={state}
                    className="w-full border border-[#1A1A1A]/20 p-3 font-sans text-sm focus:border-[#1A1A1A] outline-none bg-transparent" 
                  />
                </div>
                <div>
                  <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">Country <span className="lowercase font-normal text-red-500 tracking-normal">*</span></label>
                  <input 
                    type="text"
                    name="country"
                    required
                    defaultValue={country}
                    className="w-full border border-[#1A1A1A]/20 p-3 font-sans text-sm focus:border-[#1A1A1A] outline-none bg-transparent" 
                  />
                </div>
              </div>

              <h3 className="font-sans text-xs uppercase font-bold tracking-widest text-[#1A1A1A] border-b border-[#1A1A1A]/10 pb-4 mt-12">Delivery Method</h3>
              <div className="space-y-4">
                <label className={`flex items-center justify-between p-4 border cursor-pointer transition-colors ${deliveryMethod === 'standard' ? 'border-[#1A1A1A] bg-[#1A1A1A]/5' : 'border-[#1A1A1A]/20 hover:border-[#1A1A1A]/50'}`}>
                  <div className="flex items-center gap-4">
                    <input type="radio" value="standard" checked={deliveryMethod === 'standard'} onChange={() => setDeliveryMethod('standard')} className="accent-[#1A1A1A] w-4 h-4" />
                    <div>
                      <p className="font-sans text-sm font-medium">Standard Delivery</p>
                      <p className="font-sans text-xs text-[#1A1A1A]/60">3-5 business days</p>
                    </div>
                  </div>
                  <span className="font-sans text-sm font-bold">{cartTotal >= settings.freeShippingThreshold ? 'Free' : `Rs. ${Number(settings.deliveryFee).toFixed(2)}`}</span>
                </label>
                <label className={`flex items-center justify-between p-4 border cursor-pointer transition-colors ${deliveryMethod === 'express' ? 'border-[#1A1A1A] bg-[#1A1A1A]/5' : 'border-[#1A1A1A]/20 hover:border-[#1A1A1A]/50'}`}>
                  <div className="flex items-center gap-4">
                    <input type="radio" value="express" checked={deliveryMethod === 'express'} onChange={() => setDeliveryMethod('express')} className="accent-[#1A1A1A] w-4 h-4" />
                    <div>
                      <p className="font-sans text-sm font-medium">Express Delivery</p>
                      <p className="font-sans text-xs text-[#1A1A1A]/60">1-2 business days</p>
                    </div>
                  </div>
                  <span className="font-sans text-sm font-bold">{cartTotal >= settings.freeShippingThreshold ? `Rs. ${Number(100).toFixed(2)}` : `Rs. ${Number(settings.deliveryFee + 100).toFixed(2)}`}</span>
                </label>
              </div>
            </div>
            
            <div className="pt-8">
              <h3 className="font-sans text-xs uppercase font-bold tracking-widest text-[#1A1A1A] border-b border-[#1A1A1A]/10 pb-4 mb-6">Payment Method</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="border border-[#1A1A1A]/10 bg-white p-3 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#CDA185] mt-0.5 shrink-0" />
                  <span className="font-sans text-[10px] uppercase tracking-wider font-bold text-[#1A1A1A]/70">SSL protected checkout</span>
                </div>
                <div className="border border-[#1A1A1A]/10 bg-white p-3 flex items-start gap-2">
                  <CreditCard className="w-4 h-4 text-[#CDA185] mt-0.5 shrink-0" />
                  <span className="font-sans text-[10px] uppercase tracking-wider font-bold text-[#1A1A1A]/70">Card and COD options</span>
                </div>
                <div className="border border-[#1A1A1A]/10 bg-white p-3 flex items-start gap-2">
                  <Truck className="w-4 h-4 text-[#CDA185] mt-0.5 shrink-0" />
                  <span className="font-sans text-[10px] uppercase tracking-wider font-bold text-[#1A1A1A]/70">Tracking after order</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className={`p-6 border transition-colors ${paymentMethod === 'credit_card' ? 'border-[#1A1A1A] bg-[#1A1A1A]/5' : 'border-[#1A1A1A]/20 hover:border-[#1A1A1A]/50'}`}>
                  <label className="flex items-center gap-4 cursor-pointer">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="credit_card" 
                      checked={paymentMethod === 'credit_card'}
                      onChange={() => setPaymentMethod('credit_card')}
                      className="accent-[#1A1A1A] w-4 h-4"
                    />
                    <span className="font-sans text-base">Credit Card</span>
                  </label>
                  {paymentMethod === 'credit_card' && (
                    <div className="mt-6 space-y-6 pt-6 border-t border-[#1A1A1A]/10">
                      <div>
                        <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">Card Number <span className="lowercase font-normal text-red-500 tracking-normal">*</span></label>
                        <input 
                          type="text"
                          required
                          placeholder="0000 0000 0000 0000"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full border border-[#1A1A1A]/20 p-3 font-sans text-sm focus:border-[#1A1A1A] outline-none bg-white rounded-none" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">Expiry Date <span className="lowercase font-normal text-red-500 tracking-normal">*</span></label>
                          <input 
                            type="text"
                            required
                            placeholder="MM/YY"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            className="w-full border border-[#1A1A1A]/20 p-3 font-sans text-sm focus:border-[#1A1A1A] outline-none bg-white rounded-none" 
                          />
                        </div>
                        <div>
                          <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">CVV <span className="lowercase font-normal text-red-500 tracking-normal">*</span></label>
                          <input 
                            type="text"
                            required
                            placeholder="123"
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value)}
                            className="w-full border border-[#1A1A1A]/20 p-3 font-sans text-sm focus:border-[#1A1A1A] outline-none bg-white rounded-none" 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <label className={`flex items-center gap-4 p-6 border cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-[#1A1A1A] bg-[#1A1A1A]/5' : 'border-[#1A1A1A]/20 hover:border-[#1A1A1A]/50'}`}>
                  <input 
                    type="radio" 
                    name="payment" 
                    value="cod" 
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="accent-[#1A1A1A] w-4 h-4"
                  />
                  <span className="font-sans text-base">Cash on Delivery</span>
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Right Side: Order Summary */}
        <div id="order-summary-box" className="lg:col-span-5">
          <div className="bg-white lg:bg-[#1A1A1A]/5 p-5 sm:p-8 rounded-2xl border border-[#1A1A1A]/5 lg:border-none shadow-sm lg:shadow-none sticky lg:top-32 transition-all">
            
            {/* Header always visible on desktop */}
            <div className="hidden lg:flex justify-between items-center border-b border-[#1A1A1A]/10 pb-4 mb-6">
              <h3 className="font-sans text-xs uppercase font-bold tracking-widest text-[#1A1A1A]">Order Summary</h3>
              <span className="font-sans text-[10px] text-[#CDA185] bg-[#CDA185]/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{items.length} item{items.length === 1 ? '' : 's'}</span>
            </div>

            {/* Mobile Summary Toggle Bar */}
            <button
              type="button"
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              className="flex lg:hidden items-center justify-between w-full py-3 px-4 bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 border border-[#1A1A1A]/5 rounded-xl transition-all cursor-pointer mb-4"
              aria-expanded={isSummaryExpanded}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#CDA185]" />
                <span className="font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]">
                  {isSummaryExpanded ? 'Hide' : 'Show'} Order Summary
                </span>
                {isSummaryExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-[#1A1A1A]/65 transition-transform" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-[#1A1A1A]/65 transition-transform" />
                )}
              </div>
              <span className="font-serif italic text-sm font-bold text-[#1A1A1A]">Rs. {finalTotal.toFixed(2)}</span>
            </button>

            {/* Expandable/Collapsible Content Area */}
            <div className={`${isSummaryExpanded ? 'block' : 'hidden lg:block'} space-y-6 transition-all duration-300`}>
              {/* Product list */}
              <div className="space-y-4 mb-6 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-14 h-18 bg-[#1A1A1A]/5 overflow-hidden shrink-0 border border-[#1A1A1A]/5 relative rounded-md">
                      <SafeImage
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-serif text-xs text-[#1A1A1A] pr-2 font-medium line-clamp-2 leading-tight">{item.name}</h4>
                        <span className="font-serif italic text-xs text-[#1A1A1A] font-semibold whitespace-nowrap">
                          Rs. {item.isFlashSale && item.flashSalePrice ? Number(item.flashSalePrice).toFixed(2) : Number(item.price).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[9px] text-[#1A1A1A]/50 font-sans font-bold uppercase tracking-wider mt-1">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon inputs */}
              <div className="mb-6 space-y-2 pb-6 border-b border-[#1A1A1A]/10">
                <label className="block font-sans text-[9px] uppercase font-bold tracking-widest text-[#1A1A1A]/50">Discount Code / Voucher</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter code"
                    className="flex-1 border border-[#1A1A1A]/10 px-3 py-2 font-sans text-xs focus:border-[#1A1A1A] outline-none bg-white rounded-lg uppercase placeholder-[#1A1A1A]/40 font-bold tracking-wider" 
                    disabled={!!appliedCoupon}
                  />
                  <button 
                    type="button"
                    onClick={appliedCoupon ? () => { setAppliedCoupon(null); setCouponInput(''); setCouponError(''); } : handleApplyCoupon}
                    className="px-5 bg-[#1A1A1A] text-[#F9F7F2] font-sans text-[10px] uppercase font-bold tracking-widest transition-all hover:bg-[#CDA185] rounded-lg cursor-pointer shadow-sm shrink-0 font-bold whitespace-nowrap"
                  >
                    {appliedCoupon ? 'Remove' : 'Apply'}
                  </button>
                </div>
                {couponError && <p className="text-red-500 font-sans text-[9px] font-bold mt-1">⚠️ {couponError}</p>}
                {appliedCoupon && <p className="text-green-600 font-sans text-[9px] font-bold mt-1">✓ Coupon applied! {appliedCoupon.discountPercentage}% discount badge activated.</p>}
              </div>

              {/* Banners */}
              {hasDiscount && (
                <div className="bg-[#1A1A1A]/5 px-4 py-2 rounded-lg mb-4 flex items-center justify-between border border-[#1A1A1A]/10">
                   <span className="font-sans text-[9px] uppercase font-bold tracking-widest text-[#1A1A1A]/60">Bulk Discount</span>
                   <span className="font-serif italic text-xs text-[#1A1A1A] font-bold">-5% off 5+ items</span>
                </div>
              )}
              
              {firstTimeDiscountEligible && !appliedCoupon && (
                <div className="bg-green-500/5 border border-green-500/20 px-4 py-2 rounded-lg mb-4 flex items-center justify-between">
                   <span className="font-sans text-[9px] uppercase font-bold tracking-widest text-green-800">First Login Discount</span>
                   <span className="font-serif italic text-xs text-green-800 font-bold">-{firstTimeDiscountAmount}% off</span>
                </div>
              )}

              {/* Accounting details */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between font-sans text-xs text-[#1A1A1A]/70 font-medium">
                  <span>Subtotal</span>
                  <span className="font-sans font-bold">Rs. {cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-sans text-xs text-[#1A1A1A]/70 font-medium">
                  <span>Shipping Fee</span>
                  <span className="font-sans font-bold">{deliveryFee === 0 ? 'Free' : `Rs. ${Number(deliveryFee).toFixed(2)}`}</span>
                </div>
                {(appliedCoupon || firstTimeDiscountEligible) && (
                  <div className="flex justify-between font-sans text-xs text-green-700 font-medium">
                    <span>Discount</span>
                    <span className="font-sans font-bold">-{effectiveDiscount}%</span>
                  </div>
                )}
              </div>

              <div className="bg-white border border-[#1A1A1A]/10 rounded-xl p-4 space-y-2">
                <div className="flex justify-between gap-4 font-sans text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/65">
                  <span>Delivery Window</span>
                  <span className="text-[#1A1A1A]">{deliveryWindow}</span>
                </div>
                <div className="flex justify-between gap-4 font-sans text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/65">
                  <span>Support</span>
                  <span className="text-[#1A1A1A]">{settings.storePhone || settings.storeEmail}</span>
                </div>
                <p className="font-sans text-[10px] text-[#1A1A1A]/50 leading-relaxed">
                  Order confirmation and tracking number are saved to the backend and sent by email when available.
                </p>
              </div>
            </div>

            {/* Total Block */}
            <div className="pt-5 mt-5 border-t border-[#1A1A1A]/10 space-y-5">
              <div className="flex justify-between items-center font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                <span>Total Amount Due</span>
                <span className="font-serif italic font-bold text-2xl tracking-normal text-[#1A1A1A]">Rs. {finalTotal.toFixed(2)}</span>
              </div>

              <button 
                type="submit"
                form="checkout-form"
                disabled={isProcessing}
                className="w-full bg-[#1A1A1A] text-[#F9F7F2] py-4 rounded-full font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#CDA185] transition-all flex flex-col items-center justify-center gap-1 leading-none disabled:opacity-50 cursor-pointer shadow-md"
              >
                <span>{isProcessing ? 'Processing Securely...' : 'Confirm Order & Pay'}</span>
                <span className="text-[9px] text-[#F9F7F2]/60 tracking-wider normal-case font-normal flex items-center gap-1.5 mt-1 font-semibold">
                  <Coins className="w-3.5 h-3.5 text-[#CDA185]" /> Earn {coinsToEarn} Aabnoor Coins
                </span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
