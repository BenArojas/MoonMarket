// AuthContext.tsx
import React, { createContext, useContext, useEffect } from "react"; // 1. Import useEffect
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAuthStatus, logout as apiLogout, AuthDTO } from "@/api/auth"; // Renamed to avoid conflict
import { useStockStore } from "@/stores/stockStore"; // 2. Import your Zustand store
import { useNavigate } from "react-router-dom";

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
  // const navigate = useNavigate();

  // 3. Get connect/disconnect actions from the Zustand store
  const connectWebSocket = useStockStore((state) => state.connect);
  const disconnectWebSocket = useStockStore((state) => state.disconnect);
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

  // 4. ADD THIS USEEFFECT FOR THE CONNECTION LIFECYCLE
  useEffect(() => {
    // If the user is authenticated, connect the WebSocket
    if (isAuth === true) {
      console.log("Auth is true, connecting WebSocket...");
      connectWebSocket();
    }

    // The cleanup function for this effect will handle disconnection
    return () => {
      console.log(
        "Auth changed or component unmounted, disconnecting WebSocket..."
      );
      disconnectWebSocket();
    };
    // This effect runs whenever `isAuth` changes, or on mount/unmount.
  }, [isAuth, connectWebSocket, disconnectWebSocket]); // 5. UPDATE THE LOGOUT HANDLER

  const handleLogout = async () => {
    disconnectWebSocket();
  
    try {
      await apiLogout();
      // Remove all queries except auth, then invalidate auth
      queryClient.removeQueries({ 
        predicate: (query) => query.queryKey[0] !== "authStatus" 
      });
      queryClient.invalidateQueries({ queryKey: ["authStatus"] });
    } catch (error) {
      console.error("Logout failed:", error);
      queryClient.removeQueries({ 
        predicate: (query) => query.queryKey[0] !== "authStatus" 
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
            {children}   {" "}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
