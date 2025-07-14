// AuthContext.tsx
import { logout as apiLogout, AuthDTO, fetchAuthStatus, disconnectWebSocket as apiDisconnectWebSocket, } from "@/api/auth"; // Renamed to avoid conflict
import { useStockStore } from "@/stores/stockStore"; // 2. Import your Zustand store
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { createContext, useContext, useEffect } from "react"; // 1. Import useEffect

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
    try {
      // Step 1: Gracefully disconnect the backend WebSocket first.
      await apiDisconnectWebSocket();
      console.log("Backend WebSocket disconnected.");

      // Step 2: Log out the main IBKR session.
      await apiLogout();
      console.log("IBKR session logout initiated.");

    } catch (error) {
      console.error("An error occurred during the logout process:", error);
      // We proceed to the 'finally' block even if APIs fail.
    } finally {
      // Step 3: Always clear client-side data and state.
      // This runs regardless of whether the API calls succeeded or failed,
      // ensuring the UI doesn't get stuck in a logged-in state.
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
            {children}   {" "}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
