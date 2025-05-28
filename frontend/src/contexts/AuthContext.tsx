// AuthContext.tsx
import React, { createContext, useContext, useEffect } from "react"; // 1. Import useEffect
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAuthStatus, logout as apiLogout } from "@/api/auth"; // Renamed to avoid conflict
import { useStockStore } from "@/stores/stockStore"; // 2. Import your Zustand store

interface AuthContextType {
  isAuth: boolean | undefined;
  isLoading: boolean;
  isError: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  // 3. Get connect/disconnect actions from the Zustand store
  const connectWebSocket = useStockStore(state => state.connect);
  const disconnectWebSocket = useStockStore(state => state.disconnect);
  
  const { data: isAuth, isLoading, isError } = useQuery<boolean>({
    queryKey: ["authStatus"],
    queryFn: fetchAuthStatus,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // 4. ADD THIS USEEFFECT FOR THE CONNECTION LIFECYCLE
  useEffect(() => {
    // If the user is authenticated, connect the WebSocket
    if (isAuth === true) {
      console.log("Auth is true, connecting WebSocket...");
      connectWebSocket();
    }

    // The cleanup function for this effect will handle disconnection
    return () => {
      console.log("Auth changed or component unmounted, disconnecting WebSocket...");
      disconnectWebSocket();
    };
    // This effect runs whenever `isAuth` changes, or on mount/unmount.
  }, [isAuth, connectWebSocket, disconnectWebSocket]);


  // 5. UPDATE THE LOGOUT HANDLER
  const handleLogout = async () => {
    // First, immediately disconnect the WebSocket
    disconnectWebSocket();

    try {
      await apiLogout(); // Use the renamed import
      // Invalidate all queries and clear cache
      queryClient.clear();
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if server logout fails, clear local cache to log the user out on the frontend
      queryClient.clear();
    }
    // No need to invalidate queries after clearing, as `clear` removes everything.
    // The component will re-render, useQuery will be in its initial state,
    // and your routing logic will redirect the user.
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