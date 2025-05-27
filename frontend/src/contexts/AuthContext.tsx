// AuthContext.tsx
import React, { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAuthStatus, logout } from "@/api/auth";

interface AuthContextType {
  isAuth: boolean | undefined;
  isLoading: boolean;
  isError: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  
  const { data: isAuth, isLoading, isError } = useQuery<boolean>({
    queryKey: ["authStatus"],
    queryFn: fetchAuthStatus,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const handleLogout = async () => {
    try {
      await logout();
      // Invalidate all queries and clear cache
      queryClient.clear();
      // Specifically invalidate auth status to trigger a re-fetch
      queryClient.invalidateQueries({ queryKey: ["authStatus"] });
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if logout fails on the server, clear local cache
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["authStatus"] });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuth, 
      isLoading, 
      isError, 
      logout: handleLogout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};