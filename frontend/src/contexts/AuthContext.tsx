// AuthContext.tsx
import { logout as apiLogout, AuthDTO, fetchAuthStatus } from "@/api/auth"; // Renamed to avoid conflict
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { createContext, useContext } from "react"; // 1. Import useEffect

interface AuthContextType {
  isAuth: boolean | undefined;
  isLoading: boolean;
  isError: boolean;
  error: any
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();

  const {
    data: auth,
    isLoading,
    isError,
    error,
  } = useQuery<AuthDTO>({
    queryKey: ["authStatus"],
    queryFn: fetchAuthStatus,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
  const isAuth = auth?.authenticated;


  const handleLogout = async () => {
    try {
      // The WebSocket disconnect call is REMOVED from here.
      await apiLogout();
      console.log("IBKR session logout initiated.");
    } catch (error) {
      console.error("An error occurred during the logout process:", error);
    } finally {
      console.log("Clearing client-side data.");
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "authStatus",
      });
      queryClient.invalidateQueries({ queryKey: ["authStatus"] });
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        isAuth,
        isLoading,
        isError,
        error,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
