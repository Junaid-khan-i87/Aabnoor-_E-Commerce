import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Order, OrderItem, OrderStatus } from './types';
import { deleteEntity, listEntities, upsertEntity } from './lib/storeApi';
import { supabase } from './lib/supabase';

interface OrderContextType {
  orders: Order[];
  placeOrder: (order: Omit<Order, 'id' | 'date' | 'status' | 'trackingUpdates' | 'trackingNumber'>) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus, note?: string, coinsAdded?: boolean) => Promise<{ ok: boolean; error?: string }>;
  deleteOrder: (id: string) => void;
  updateOrder: (id: string, updatedOrder: Partial<Order>) => void;
  getUserOrders: (email: string) => Order[];
  trackOrder: (trackingNumber: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const generateTrackingNumber = () => {
  const countryCode = 'PK';
  const year = new Date().getFullYear().toString().slice(-2);
  const sequence = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${countryCode}-${year}-${sequence}`;
};

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);

  React.useEffect(() => {
    let isMounted = true;

    listEntities<Order>('orders').then(remoteOrders => {
      if (isMounted && remoteOrders) {
        setOrders(remoteOrders);
      }
    });

    const { data: listener } = supabase?.auth.onAuthStateChange(() => {
      listEntities<Order>('orders').then(remoteOrders => {
        if (remoteOrders) {
          setOrders(remoteOrders);
        }
      });
    }) || { data: null };

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const updateOrdersStorage = (newOrders: Order[]) => {
    void newOrders;
  };

  const deleteOrder = (id: string) => {
    setOrders(prev => {
      const next = prev.filter(o => o.id !== id);
      updateOrdersStorage(next);
      deleteEntity('orders', id);
      return next;
    });
  };

  const updateOrder = (id: string, updatedOrder: Partial<Order>) => {
    setOrders(prev => {
      const next = prev.map(order => 
        order.id === id ? { ...order, ...updatedOrder } : order
      );
      updateOrdersStorage(next);
      const updated = next.find(order => order.id === id);
      if (updated) upsertEntity('orders', updated);
      return next;
    });
  };

  const placeOrder = async (orderData: Omit<Order, 'id' | 'date' | 'status' | 'trackingUpdates' | 'trackingNumber'>) => {
    const generatedTracking = generateTrackingNumber();

    const newOrder: Order = {
      ...orderData,
      id: `ORD-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
      trackingNumber: generatedTracking,
      date: new Date().toISOString(),
      status: 'Pending',
      trackingUpdates: [{
        status: 'Pending',
        date: new Date().toISOString(),
        note: 'Order placed, awaiting admin approval'
      }]
    };
    setOrders(prev => {
      const next = [newOrder, ...prev];
      updateOrdersStorage(next);
      return next;
    });

    const saved = await upsertEntity('orders', newOrder);
    if (!saved) {
      throw new Error('Order could not be saved to the backend.');
    }

    return newOrder;
  };

  const refreshOrders = async () => {
    const remoteOrders = await listEntities<Order>('orders');
    if (remoteOrders) {
      setOrders(remoteOrders);
    }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus, note?: string, coinsAdded?: boolean) => {
    let orderToSave: Order | undefined;

    setOrders(prev => {
      const next = prev.map(order => {
        if (order.id === id) {
          const updateNote = note || `Order marked as ${status}`;
          orderToSave = {
            ...order,
            status,
            ...(coinsAdded !== undefined ? { coinsAdded } : {}),
            trackingUpdates: [
              ...(order.trackingUpdates || []),
              { status, date: new Date().toISOString(), note: updateNote }
            ]
          };
          return orderToSave;
        }
        return order;
      });
      updateOrdersStorage(next);
      return next;
    });

    if (!orderToSave) return { ok: false, error: 'Order not found.' };

    const token = (await supabase?.auth.getSession())?.data.session?.access_token;
    if (!token) {
      await refreshOrders();
      return { ok: false, error: 'Missing admin session.' };
    }

    const response = await fetch('/api/admin-update-order-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orderId: id,
        status,
        note: note || `Order marked as ${status}`,
        ...(coinsAdded !== undefined ? { coinsAdded } : {}),
      }),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.order) {
      console.error('Admin order status update failed.', result?.error || response.statusText);
      await refreshOrders();
      return { ok: false, error: result?.error || response.statusText || 'Order status update failed.' };
    }

    setOrders(prev => prev.map(order => order.id === id ? result.order : order));
    return { ok: true };
  };

  const getUserOrders = (email: string) => {
    return orders.filter(o => o.userEmail === email);
  };

  const trackOrder = (trackingNumber: string) => {
    return orders.find(o => o.trackingNumber?.toLowerCase() === trackingNumber.toLowerCase());
  };

  return (
    <OrderContext.Provider value={{ orders, placeOrder, updateOrderStatus, deleteOrder, updateOrder, getUserOrders, trackOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}
