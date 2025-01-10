  import { createContext, useContext, useMemo, useCallback } from "react";
  import { useAuth } from "@/contexts/AuthProvider";
  import { refreshJwtKey } from "@/api/user";

  const RefreshContext = createContext();

  const RefreshProvider = ({ children }) => {
    const { sets } = useAuth();

    const parseISO8601Duration = useCallback((duration) => {
      const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
      const hours = match[1] ? parseInt(match[1]) : 0;
      const minutes = match[2] ? parseInt(match[2]) : 0;
      const seconds = match[3] ? parseInt(match[3]) : 0;
      return (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
    }, []);

    const scheduleRefresh = useCallback((refresh, expiresIn) => {
      const duration = parseISO8601Duration(expiresIn);
      const delay = duration - 60000; // Refresh 1 minute before expiration

      return setTimeout(() => refreshFunction(refresh), delay);
    }, [parseISO8601Duration]);

    const refreshFunction = useCallback(async (refresh) => {
      console.log("refreshing jwt key...");
      try {
        const response = await refreshJwtKey(refresh);
        const { access_, access__expires } = response.data;

        // Update only the access  and its expiry, keep the existing refresh 
        sets(access_, refresh, access__expires);
        
        // Schedule the next refresh
        return scheduleRefresh(refresh, access__expires);
      } catch (error) {
        console.error("Error refreshing :", error);
        // Handle error (e.g., logout user, show error message)
      }
    }, [sets, scheduleRefresh]);

    const initializeRefresh = useCallback((refresh, expiresIn) => {
      return scheduleRefresh(refresh, expiresIn);
    }, [scheduleRefresh]);

    const contextValue = useMemo(
      () => ({
        refreshFunction,
        initializeRefresh,
      }),
      [refreshFunction, initializeRefresh]
    );

    return (
      <RefreshContext.Provider value={contextValue}>
        {children}
      </RefreshContext.Provider>
    );
  };

  export const useRefresh = () => {
    return useContext(RefreshContext);
  };

  export default RefreshProvider;