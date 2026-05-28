import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Package, MapPin, Truck, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrders } from '../OrderContext';
import { Order } from '../types';
import { SEO } from '../components/SEO';

export function TrackPage() {
  const { trackOrder } = useOrders();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [searched, setSearched] = useState(false);
  const [orderDetails, setOrderDetails] = useState<Order | undefined>(undefined);
  const [error, setError] = useState('');
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      setError('Please enter a tracking number.');
      return;
    }

    const cleanTrackingNumber = trackingNumber.trim().toUpperCase();
    const order = trackOrder(cleanTrackingNumber);
    setSearched(true);
    if (order) {
      setOrderDetails(order);
      setError('');
      return;
    }

    setIsTracking(true);
    try {
      const response = await fetch('/api/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber: cleanTrackingNumber }),
      });
      const result = await response.json();

      if (!response.ok || !result.order) {
        setOrderDetails(undefined);
        setError(result.error || 'No order found with the provided details.');
        return;
      }

      setOrderDetails(result.order);
      setError('');
    } catch {
      setOrderDetails(undefined);
      setError('Tracking service is temporarily unavailable. Please try again.');
    } finally {
      setIsTracking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Package className="w-5 h-5" />;
      case 'Processing': return <Search className="w-5 h-5" />;
      case 'Shipped': return <Truck className="w-5 h-5" />;
      case 'Delivered': return <CheckCircle className="w-5 h-5" />;
      default: return <MapPin className="w-5 h-5" />;
    }
  };

  const statusPriority = {
    'Pending': 1,
    'Processing': 2,
    'Shipped': 3,
    'Delivered': 4,
    'Cancelled': 0
  };

  const currentPriority = orderDetails ? statusPriority[orderDetails.status as keyof typeof statusPriority] : 0;

  return (
    <div className="pt-32 lg:pt-40 pb-24 max-w-4xl mx-auto px-6 min-h-screen">
      <SEO
        title="Track Your Aabnoor Order | Aabnoor Beaute"
        description="Track your Aabnoor Beaute order using your tracking number and see live status updates for your beauty purchase."
        canonicalPath="/track"
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="font-serif italic text-4xl text-[#1A1A1A] mb-4">Track Your Order</h1>
        <p className="font-sans text-sm text-[#1A1A1A]/70 max-w-lg mx-auto">
          Enter your tracking number below to get real-time updates on your package.
        </p>
      </motion.div>

      <div className="bg-[#1A1A1A]/5 p-8 max-w-2xl mx-auto mb-12">
        <form onSubmit={handleTrack} className="space-y-6">
          <div>
            <label className="block font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/70 mb-2">Tracking Number</label>
            <input 
              type="text" 
              placeholder="e.g. PK-26-1234567"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full border border-[#1A1A1A]/20 p-3 font-sans text-sm focus:border-[#1A1A1A] outline-none bg-transparent uppercase placeholder:normal-case" 
            />
          </div>
          {error && <p className="text-red-500 font-sans text-[10px]">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-[#1A1A1A] text-[#F9F7F2] py-4 rounded-full font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/90 transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" /> {isTracking ? 'Checking...' : 'Track Package'}
          </button>
        </form>
      </div>

      <AnimatePresence mode="wait">
        {searched && orderDetails && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="border border-[#1A1A1A]/10 p-8"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#1A1A1A]/10 pb-6 mb-8 gap-4">
              <div>
                <p className="font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/50">Order Details</p>
                <h2 className="font-serif italic text-2xl text-[#1A1A1A]">{orderDetails.id}</h2>
              </div>
              <div className="text-left md:text-right">
                <span className={`inline-block px-3 py-1 text-[10px] uppercase font-bold tracking-[0.1em] text-[#1A1A1A] ${orderDetails.status === 'Cancelled' ? 'bg-red-500/10' : 'bg-[#1A1A1A]/10'}`}>
                  {orderDetails.status}
                </span>
                <p className="font-sans text-xs text-[#1A1A1A]/60 mt-1">Placed on {new Date(orderDetails.date).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="mb-12">
               <h3 className="font-sans text-[11px] uppercase font-bold tracking-[0.2em] text-[#1A1A1A] mb-8">Tracking History</h3>
               {orderDetails.status === 'Cancelled' ? (
                 <div className="p-4 bg-red-500/10 text-red-700 font-sans text-sm text-center">
                   This order has been cancelled.
                 </div>
               ) : (
                 <div className="relative">
                   <div className="absolute top-5 left-8 right-8 h-[2px] bg-[#1A1A1A]/10 -z-10 hidden md:block"></div>
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                     {['Pending', 'Processing', 'Shipped', 'Delivered'].map((step, index) => {
                       const stepPriority = statusPriority[step as keyof typeof statusPriority];
                       const isCompleted = currentPriority >= stepPriority;
                       const isCurrent = currentPriority === stepPriority;
                       
                       return (
                         <div key={step} className="flex flex-row md:flex-col items-center gap-4 text-center md:text-left">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${isCompleted ? 'bg-[#1A1A1A] border-[#1A1A1A] text-[#F9F7F2]' : 'bg-[#F9F7F2] border-[#1A1A1A]/20 text-[#1A1A1A]/20'}`}>
                              {getStatusIcon(step)}
                           </div>
                           <div className="text-left md:text-center mt-0 md:mt-2">
                             <p className={`font-sans text-xs font-bold uppercase tracking-widest ${isCurrent ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/60'}`}>{step}</p>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               )}
            </div>
            
            {/* Detailed Updates */}
            {orderDetails.trackingUpdates && orderDetails.trackingUpdates.length > 0 && (
              <div className="space-y-6 pt-8 border-t border-[#1A1A1A]/10">
                <h3 className="font-sans text-[11px] uppercase font-bold tracking-[0.2em] text-[#1A1A1A] mb-4">Latest Updates</h3>
                <div className="space-y-4">
                  {[...orderDetails.trackingUpdates].reverse().map((update, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="mt-1">
                        <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-green-500' : 'bg-[#1A1A1A]/20'}`}></div>
                      </div>
                      <div>
                        <p className="font-bold text-sm">{update.status}</p>
                        <p className="text-xs text-[#1A1A1A]/60 font-sans mt-0.5">{new Date(update.date).toLocaleString()}</p>
                        <p className="text-sm font-sans mt-1 text-[#1A1A1A]/80">{update.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <section className="mt-16 border-t border-[#1A1A1A]/10 pt-10">
        <h2 className="font-serif italic text-3xl text-[#1A1A1A] mb-5">How Aabnoor Order Tracking Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans text-sm leading-7 text-[#1A1A1A]/68">
          <p>
            Every Aabnoor checkout creates a secure order record with a unique tracking number. Use the tracking code from your confirmation email to review the latest status, including pending, processing, shipped and delivered updates.
          </p>
          <p>
            If your tracking number is not found, check that the full code was copied from your email. For delivery questions, product support or address help, contact our support team and include your order number so we can respond quickly.
          </p>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/shipping" className="text-[10px] uppercase tracking-[0.18em] font-bold border-b border-[#1A1A1A]/40 pb-1 hover:text-[#CDA185]">Shipping Details</Link>
          <Link to="/contact" className="text-[10px] uppercase tracking-[0.18em] font-bold border-b border-[#1A1A1A]/40 pb-1 hover:text-[#CDA185]">Contact Support</Link>
          <Link to="/faq" className="text-[10px] uppercase tracking-[0.18em] font-bold border-b border-[#1A1A1A]/40 pb-1 hover:text-[#CDA185]">Order FAQs</Link>
        </div>
      </section>
    </div>
  );
}
