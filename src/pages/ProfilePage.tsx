import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useOrders } from '../OrderContext';
import { useSite } from '../SiteContext';
import { useUI } from '../UIContext';
import { useLoyalty } from '../LoyaltyContext';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock, LogOut } from 'lucide-react';
import { OrderStatus } from '../types';

export function ProfilePage() {
  const { orders } = useOrders();
  const { currentUser, setCurrentUser, users } = useSite();
  const { setIsLoginOpen } = useUI();
  const { coins } = useLoyalty();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      setIsLoginOpen(true);
    }
  }, [currentUser, navigate, setIsLoginOpen]);

  const userEmail = currentUser;
  const myOrders = orders.filter(o => o.userEmail === userEmail);
  const myUserMatch = users.find(u => u.email === currentUser);

  const STAGES = ['Pending', 'Processing', 'Shipped', 'Delivered'];

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'Pending': return <Clock className="w-4 h-4" />;
      case 'Processing': return <Package className="w-4 h-4" />;
      case 'Shipped': return <Truck className="w-4 h-4" />;
      case 'Delivered': return <CheckCircle className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] pt-32 lg:pt-40 pb-24 px-4 md:px-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-end mb-4 border-b border-[#1A1A1A]/10 pb-4">
        <div>
          <h1 className="font-serif italic text-4xl text-[#1A1A1A] mb-1">My Profile</h1>
          <p className="font-sans text-xs text-[#1A1A1A]/60 font-semibold uppercase tracking-widest">{currentUser}</p>
        </div>
        <button 
          onClick={() => {
            setCurrentUser(null);
            navigate('/');
          }}
          className="flex items-center gap-2 text-sm text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors font-medium border border-[#1A1A1A]/10 hover:border-[#1A1A1A] px-4 py-2 rounded-full cursor-pointer bg-white"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* Account Score and Status Widget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        <div className="bg-white p-5 border border-[#1A1A1A]/5 rounded-xl shadow-sm flex flex-col justify-center">
          <p className="font-sans text-[10px] uppercase tracking-widest text-[#1A1A1A]/50 font-bold mb-1">Aura Coins Balance</p>
          <div className="flex items-center gap-2">
            <span className="font-serif italic text-3xl text-[#CDA185] font-semibold">{coins}</span>
            <span className="font-sans text-[10px] uppercase font-bold text-[#1A1A1A]/70 tracking-widest">Coins Available</span>
          </div>
          <p className="font-sans text-[9px] text-[#1A1A1A]/50 mt-2">Earned 10 coins per Rs. 100 spent. Redeemable directly on any product page.</p>
        </div>

        {myUserMatch && myUserMatch.warnings > 0 ? (
          <div className="bg-amber-50/50 border border-amber-500/20 p-5 rounded-xl flex flex-col justify-center">
            <p className="font-sans text-[10px] uppercase tracking-widest text-amber-800 font-bold mb-1">⚠️ Profile Warning Citation</p>
            <p className="font-sans text-xs text-amber-900 leading-relaxed font-medium">
              Your profile has received <strong className="text-amber-600 underline font-bold">{myUserMatch.warnings} official citation(s)</strong> from shop managers for code violations. Please maintain elite protocol.
            </p>
          </div>
        ) : (
          <div className="bg-[#1A1A1A]/5 p-5 rounded-xl border border-[#1A1A1A]/5 flex flex-col justify-center">
            <p className="font-sans text-[10px] uppercase tracking-widest text-[#1A1A1A]/40 font-bold mb-1">Profile Status</p>
            <div className="flex items-center gap-2 py-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-sans text-xs uppercase tracking-widest font-bold text-green-700">Elite Account Active</span>
            </div>
            <p className="font-sans text-[9px] text-[#1A1A1A]/50 mt-1">Zero warnings. Thank you for your continued loyalty.</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="font-serif italic text-2xl text-[#1A1A1A] mb-4">My Orders</h2>
      </div>

      <div className="space-y-12">
        {myOrders.length === 0 ? (
          <p className="font-sans text-sm text-[#1A1A1A]/60">You have no orders yet.</p>
        ) : (
          myOrders.map(order => {
            const currentStageIndex = STAGES.indexOf(order.status);

            return (
              <div key={order.id} className="bg-white p-6 md:p-8 border border-[#1A1A1A]/10 relative">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8 pb-8 border-b border-[#1A1A1A]/10">
                  <div>
                    <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A] mb-1">Order {order.id}</h3>
                    <p className="font-sans text-xs text-[#1A1A1A]/60">{new Date(order.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="font-serif italic text-xl text-[#1A1A1A] mb-1">Rs. {order.total.toFixed(2)}</p>
                    <p className="font-sans text-xs text-[#1A1A1A]/60">{order.items.length} items</p>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-8">
                    <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Tracking Status</h4>
                    {order.status !== 'Delivered' && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="font-sans text-[8px] uppercase tracking-[0.1em] font-bold text-green-700">Live</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Horizontal Progress Bar */}
                  <div className="relative mb-12 px-2 md:px-8">
                    <div className="absolute top-1/2 left-4 right-4 h-1 bg-[#1A1A1A]/10 -translate-y-1/2 z-0 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-[#1A1A1A]"
                      />
                    </div>
                    
                    <div className="relative z-10 flex justify-between">
                      {STAGES.map((stage, idx) => {
                        const isCompleted = idx <= currentStageIndex;
                        const isCurrent = idx === currentStageIndex;
                        return (
                          <div key={stage} className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-500 mb-3 border-2 ${
                              isCompleted ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white' : 'bg-white border-[#1A1A1A]/20 text-[#1A1A1A]/40'
                            } ${isCurrent ? 'ring-4 ring-[#1A1A1A]/20' : ''}`}>
                              {getStageIcon(stage)}
                            </div>
                            <span className={`font-sans text-[10px] uppercase tracking-widest font-bold text-center ${
                              isCurrent ? 'text-[#1A1A1A]' : isCompleted ? 'text-[#1A1A1A]/70' : 'text-[#1A1A1A]/40'
                            }`}>
                              {stage}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vertical Tracking Log Details */}
                  {order.trackingUpdates && order.trackingUpdates.length > 0 && (
                    <div className="mt-8 bg-[#F9F7F2]/50 p-6 border border-[#1A1A1A]/5 rounded-xl block">
                      <h4 className="font-sans text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A] mb-4">Latest Updates</h4>
                      <div className="space-y-4">
                        {order.trackingUpdates.map((update, idx) => {
                          const isLast = idx === (order.trackingUpdates?.length ?? 0) - 1;
                          return (
                            <div key={idx} className={`flex gap-4 items-start ${isLast ? '' : 'opacity-50'}`}>
                              <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-1.5 shrink-0" />
                              <div>
                                <p className="font-sans text-xs font-bold text-[#1A1A1A]">{update.note}</p>
                                <p className="font-sans text-[10px] uppercase tracking-widest text-[#1A1A1A]/50 mt-0.5">{new Date(update.date).toLocaleString()}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {(order.shippingAddress || order.paymentMethod) && (
                  <div className="mb-8 pt-8 border-t border-[#1A1A1A]/10 grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {order.shippingAddress && (
                      <div>
                        <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A] mb-3">Shipping Address</h4>
                        <p className="font-sans text-sm text-[#1A1A1A]/70 whitespace-pre-line">{order.shippingAddress}</p>
                      </div>
                    )}
                    {order.paymentMethod && (
                      <div>
                        <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A] mb-3">Payment Method</h4>
                        <p className="font-sans text-sm text-[#1A1A1A]/70">{order.paymentMethod}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-8 border-t border-[#1A1A1A]/10">
                  <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A] mb-4">Items</h4>
                  <ul className="space-y-2">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between font-sans text-sm pb-2 border-b border-[#1A1A1A]/5 last:border-0 last:pb-0">
                        <span>{item.quantity}x {item.name}</span>
                        <span>Rs. {item.price.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
