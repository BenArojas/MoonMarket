// AuthContext.tsx
import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAuthStatus } from "@/api/auth";


interface AuthContextType {
  isAuth: boolean | undefined;
  isLoading: boolean;
  isError: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: isAuth, isLoading, isError } = useQuery<boolean>({
    queryKey: ["authStatus"],
    queryFn: fetchAuthStatus,
    retry: false,
    refetchOnWindowFocus: false,
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