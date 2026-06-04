import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Order, OrderStatus } from './types';
import { deleteEntity, listEntities, upsertEntity } from './lib/storeApi';
import { supabase } from './lib/supabase';

type PlaceOrderInput = {
  userName: string;
  items: { productId: string; quantity: number }[];
  phone: string;
  home: string;
  state: string;
  country: string;
  paymentMethod: 'Credit Card' | 'Cash on Delivery';
  deliveryMethod: 'standard' | 'express';
  couponCode?: string;
  coinsToRedeem?: number;
};

interface OrderContextType {
  orders: Order[];
  placeOrder: (order: PlaceOrderInput) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus, note?: string, coinsAdded?: boolean) => Promise<{ ok: boolean; error?: string }>;
  deleteOrder: (id: string) => void;
  updateOrder: (id: string, updatedOrder: Partial<Order>) => void;
  refreshOrders: () => Promise<void>;
  getUserOrders: (email: string) => Order[];
  fetchUserOrders: () => Promise<Order[]>;
  trackOrder: (trackingNumber: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children, isAdmin = false }: { children: ReactNode; isAdmin?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);

  React.useEffect(() => {
    let isMounted = true;

    if (!isAdmin) {
      setOrders([]);
      return () => {
        isMounted = false;
      };
    }

    listEntities<Order>('orders').then(remoteOrders => {
      if (isMounted && remoteOrders) {
        setOrders(remoteOrders);
      }
    });

    const { data: listener } = supabase?.auth.onAuthStateChange(() => {
      if (!isAdmin) {
        setOrders([]);
        return;
      }

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
  }, [isAdmin]);

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

  const placeOrder = async (orderData: PlaceOrderInput) => {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token;
    if (!token) {
      throw new Error('Sign in before placing an order.');
    }

    const response = await fetch('/api/place-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.order) {
      throw new Error(result?.error || 'Order could not be placed. Please try again or contact support.');
    }

    const newOrder = {
      ...result.order,
      ...(typeof result.coinsEarned === 'number' ? { coinsEarned: result.coinsEarned } : {}),
      ...(typeof result.coinBalance === 'number' ? { coinBalance: result.coinBalance } : {}),
    } as Order;
    setOrders(prev => {
      const next = [newOrder, ...prev];
      updateOrdersStorage(next);
      return next;
    });

    return newOrder;
  };

  const refreshOrders = React.useCallback(async () => {
    if (!isAdmin) return;

    const remoteOrders = await listEntities<Order>('orders');
    if (remoteOrders) {
      setOrders(remoteOrders);
    }
  }, [isAdmin]);

  const fetchUserOrders = React.useCallback(async () => {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token;
    if (!token) {
      setOrders([]);
      return [];
    }

    const response = await fetch('/api/my-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(result?.orders)) {
      throw new Error(result?.error || 'Orders could not be loaded.');
    }

    const userOrders = result.orders as Order[];
    setOrders(prev => {
      const merged = new Map<string, Order>();
      userOrders.forEach(order => merged.set(order.id, order));
      prev.forEach(order => merged.set(order.id, order));
      return Array.from(merged.values()).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    });
    return userOrders;
  }, []);

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
    <OrderContext.Provider value={{ orders, placeOrder, updateOrderStatus, deleteOrder, updateOrder, refreshOrders, getUserOrders, fetchUserOrders, trackOrder }}>
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
