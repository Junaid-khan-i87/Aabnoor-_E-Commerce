import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoyaltyContextType {
  coins: number;
  addCoins: (amount: number) => void;
  redeemCoins: (amount: number) => boolean;
}

const LoyaltyContext = createContext<LoyaltyContextType | undefined>(undefined);

export function LoyaltyProvider({ children }: { children: ReactNode }) {
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem('aura_coins');
    return saved ? parseInt(saved, 10) : 0;
  });

  const addCoins = (amount: number) => {
    setCoins(prev => {
      const newAmount = prev + amount;
      localStorage.setItem('aura_coins', newAmount.toString());
      return newAmount;
    });
  };

  const redeemCoins = (amount: number) => {
    const saved = localStorage.getItem('aura_coins');
    const currentCoins = saved ? parseInt(saved, 10) : coins;
    
    if (currentCoins >= amount) {
      const newAmount = currentCoins - amount;
      localStorage.setItem('aura_coins', newAmount.toString());
      setCoins(newAmount);
      return true;
    }
    return false;
  };

  return (
    <LoyaltyContext.Provider value={{ coins, addCoins, redeemCoins }}>
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
