import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Order, OrderItem, OrderStatus } from './types';

interface OrderContextType {
  orders: Order[];
  placeOrder: (order: Omit<Order, 'id' | 'date' | 'status' | 'trackingUpdates' | 'trackingNumber'>) => Order;
  updateOrderStatus: (id: string, status: OrderStatus, note?: string, coinsAdded?: boolean) => void;
  deleteOrder: (id: string) => void;
  updateOrder: (id: string, updatedOrder: Partial<Order>) => void;
  getUserOrders: (email: string) => Order[];
  trackOrder: (trackingNumber: string) => Order | undefined;
}

const MOCK_ORDERS: Order[] = [
  { 
    id: 'ORD-001', 
    userEmail: 'jane.doe@example.com', 
    date: '2026-05-23T10:00:00Z', 
    trackingNumber: 'TRK-123456789',
    total: 125, 
    status: 'Delivered', 
    coinsEarned: 12,
    items: [{ productId: 'p1', name: 'The Cleanser', price: 125, quantity: 1 }],
    trackingUpdates: [
      { status: 'Pending', date: '2026-05-20T10:00:00Z', note: 'Order placed' },
      { status: 'Processing', date: '2026-05-21T09:00:00Z', note: 'Order approved and packing' },
      { status: 'Shipped', date: '2026-05-22T14:30:00Z', note: 'In transit' },
      { status: 'Delivered', date: '2026-05-23T10:00:00Z', note: 'Delivered to customer' },
    ]
  },
  { 
    id: 'ORD-002', 
    userEmail: 'smith.john@example.com', 
    date: '2026-05-23T14:00:00Z', 
    trackingNumber: 'TRK-987654321',
    total: 85, 
    status: 'Processing', 
    coinsEarned: 8,
    items: [{ productId: 'p2', name: 'The Serum', price: 85, quantity: 1 }],
    trackingUpdates: [
      { status: 'Pending', date: '2026-05-23T14:00:00Z', note: 'Order placed' },
      { status: 'Processing', date: '2026-05-23T16:00:00Z', note: 'Order approved and packing' },
    ]
  },
];

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const generateTrackingNumber = () => {
  const countryCode = 'PK';
  const year = new Date().getFullYear().toString().slice(-2);
  const sequence = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${countryCode}-${year}-${sequence}`;
};

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('aura_orders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return MOCK_ORDERS;
      }
    }
    return MOCK_ORDERS;
  });

  // Poll localStorage for real-time updates across tabs/windows
  React.useEffect(() => {
    const intervalId = setInterval(() => {
      const saved = localStorage.getItem('aura_orders');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Only update if visually different to avoid unnecessary re-renders
          if (JSON.stringify(parsed) !== JSON.stringify(orders)) {
            setOrders(parsed);
          }
        } catch (e) {
          // ignore
        }
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [orders]);

  const updateOrdersStorage = (newOrders: Order[]) => {
    localStorage.setItem('aura_orders', JSON.stringify(newOrders));
  };

  const deleteOrder = (id: string) => {
    setOrders(prev => {
      const next = prev.filter(o => o.id !== id);
      updateOrdersStorage(next);
      return next;
    });
  };

  const updateOrder = (id: string, updatedOrder: Partial<Order>) => {
    setOrders(prev => {
      const next = prev.map(order => 
        order.id === id ? { ...order, ...updatedOrder } : order
      );
      updateOrdersStorage(next);
      return next;
    });
  };

  const placeOrder = (orderData: Omit<Order, 'id' | 'date' | 'status' | 'trackingUpdates' | 'trackingNumber'>) => {
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
    return newOrder;
  };

  const updateOrderStatus = (id: string, status: OrderStatus, note?: string, coinsAdded?: boolean) => {
    setOrders(prev => {
      const next = prev.map(order => {
        if (order.id === id) {
          const updateNote = note || `Order marked as ${status}`;
          return {
            ...order,
            status,
            ...(coinsAdded !== undefined ? { coinsAdded } : {}),
            trackingUpdates: [
              ...(order.trackingUpdates || []),
              { status, date: new Date().toISOString(), note: updateNote }
            ]
          };
        }
        return order;
      });
      updateOrdersStorage(next);
      return next;
    });
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
