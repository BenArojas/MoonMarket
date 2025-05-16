// src/context/UserContext.tsx
import React, { createContext, useContext } from 'react';

export interface HoldingData{
  avg_bought_price: number;
  position_started: string;
  quantity: number;
  ticker: string;
}

export interface UserData {
  id: string;
  email: string;
  holdings: HoldingData[]
  transactions: string[];
  deposits: Array<{ id: number; amount: number; date: string }>;
  current_balance: number;
  profit: number;
  last_refresh: string | null;
  username: string ;
  enabled: boolean;
  yearly_expenses: Array<{
    year: number;
    commission_paid: number;
    taxes_paid: number;
  }>;
  account_type: 'free' | 'premium';
  watchlist: string[];
  watchlist_portfolio: Array<{
    ticker: string;
    quantity: number;
  }>;
  friends: string[];
  ibkr_access_token?: string
  ibkr_refresh_token?: string
  ibkr_token_expiry?: string;
  ibkr_is_connected?: boolean;
}

interface UserProviderProps {
  children: React.ReactNode;
  userData: UserData | null;
}

const UserContext = createContext<UserData | null>(null);

export const UserProvider: React.FC<UserProviderProps> = ({ children, userData }) => {
  return (
    <UserContext.Provider value={userData}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserData => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};