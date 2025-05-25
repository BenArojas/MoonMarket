// AuthContext.tsx
import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAuthStatus } from "@/api/auth";


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
  api_provider: string
  ibkr_is_connected: boolean
  ibkr_last_verified? : string
}

interface AuthContextType {
  user: UserData | null;
  isLoading: boolean;
  isError: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: isAuth, isLoading, isError } = useQuery<UserData | null>({
    queryKey: ["authStatus"],
    queryFn: fetchAuthStatus,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <AuthContext.Provider value={{ isAuth, isLoading, isError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};