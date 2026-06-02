import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './lib/supabase';

interface LoyaltyContextType {
  coins: number;
  addCoins: (amount: number) => void;
  redeemCoins: (amount: number) => boolean;
  refreshCoins: () => Promise<void>;
  syncCoinBalance: (amount: number) => void;
}

const LoyaltyContext = createContext<LoyaltyContextType | undefined>(undefined);

export function LoyaltyProvider({ children }: { children: ReactNode }) {
  const [coins, setCoins] = useState(0);

  const loadCoinsForSession = useCallback(async () => {
    if (!supabase) {
      setCoins(0);
      return;
    }

    const { data: sessionResult } = await supabase.auth.getSession();
    const user = sessionResult.session?.user;
    const email = user?.email?.toLowerCase();

    if (!user?.id || !email) {
      setCoins(0);
      return;
    }

    const customerId = `USR-${user.id}`;
    let { data: customerRow } = await supabase
      .from('customers')
      .select('data')
      .eq('id', customerId)
      .maybeSingle();

    if (!customerRow) {
      const fallbackResult = await supabase
        .from('customers')
        .select('data')
        .eq('data->>email', email)
        .maybeSingle();
      customerRow = fallbackResult.data;
    }

    const nextCoins = Math.max(0, Math.floor(Number(customerRow?.data?.coins) || 0));
    setCoins(nextCoins);
  }, []);

  useEffect(() => {
    loadCoinsForSession();

    const { data: listener } = supabase?.auth.onAuthStateChange(() => {
      loadCoinsForSession();
    }) || { data: null };

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [loadCoinsForSession]);

  const addCoins = (_amount: number) => {
    void loadCoinsForSession();
  };

  const redeemCoins = (amount: number) => {
    void loadCoinsForSession();
    return Number.isInteger(amount) && amount >= 0 && coins >= amount;
  };

  const syncCoinBalance = (amount: number) => {
    if (Number.isFinite(amount)) {
      setCoins(Math.max(0, Math.floor(amount)));
    }
  };

  return (
    <LoyaltyContext.Provider value={{ coins, addCoins, redeemCoins, refreshCoins: loadCoinsForSession, syncCoinBalance }}>
      {children}
    </LoyaltyContext.Provider>
  );
}

export function useLoyalty() {
  const context = useContext(LoyaltyContext);
  if (context === undefined) {
    throw new Error('useLoyalty must be used within a LoyaltyProvider');
  }
  return context;
}
