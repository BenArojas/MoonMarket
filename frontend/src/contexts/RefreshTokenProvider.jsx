import { createContext, useContext, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { refreshJwtKey } from "@/api/user";

const RefreshTokenContext = createContext();

const RefreshTokenProvider = ({ children }) => {
  const { setTokens } = useAuth();

  const parseISO8601Duration = useCallback((duration) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;
    return (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
  }, []);

  const scheduleTokenRefresh = useCallback((refreshToken, expiresIn) => {
    const duration = parseISO8601Duration(expiresIn);
    const delay = duration - 60000; // Refresh 1 minute before expiration

    return setTimeout(() => refreshTokenFunction(refreshToken), delay);
  }, [parseISO8601Duration]);

  const refreshTokenFunction = useCallback(async (refreshToken) => {
    console.log("refreshing jwt key...");
    try {
      const response = await refreshJwtKey(refreshToken);
      const { access_token, access_token_expires } = response.data;

      // Update only the access token and its expiry, keep the existing refresh token
      setTokens(access_token, refreshToken, access_token_expires);
      
      // Schedule the next refresh
      return scheduleTokenRefresh(refreshToken, access_token_expires);
    } catch (error) {
      console.error("Error refreshing token:", error);
      // Handle error (e.g., logout user, show error message)
    }
  }, [setTokens, scheduleTokenRefresh]);

  const initializeTokenRefresh = useCallback((refreshToken, expiresIn) => {
    return scheduleTokenRefresh(refreshToken, expiresIn);
  }, [scheduleTokenRefresh]);

  const contextValue = useMemo(
    () => ({
      refreshTokenFunction,
      initializeTokenRefresh,
    }),
    [refreshTokenFunction, initializeTokenRefresh]
  );

  return (
    <RefreshTokenContext.Provider value={contextValue}>
      {children}
    </RefreshTokenContext.Provider>
  );
};

export const useRefreshToken = () => {
  return useContext(RefreshTokenContext);
};

export default RefreshTokenProvider;