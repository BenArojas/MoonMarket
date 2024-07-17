import { createContext, useContext, useMemo, useCallback  } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { refreshJwtKey } from "@/api/user";

// Create the refresh token context
const RefreshTokenContext = createContext();

// RefreshTokenProvider component to provide the refresh token context to children
const RefreshTokenProvider = ({ children }) => {
  const { token, setToken } = useAuth();

  // Function to parse ISO 8601 durations
  const parseISO8601Duration = useCallback(async (duration) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;
    return (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
  }, []);

  // Function to schedule the token refresh
  const scheduleTokenRefresh = useCallback(async (token, expiresIn) => {
    const duration = await parseISO8601Duration(expiresIn);
    const delay = duration - 30000; 

    setTimeout(() => refreshToken(token), delay);
  }, [parseISO8601Duration]);

  // Function to refresh the token
  const refreshToken = useCallback(async (token) => {
    console.log("refreshing jwt key...");
    try {
      const response = await refreshJwtKey(token);
      const { access_token } = response.data;

      await setToken(access_token);
      await scheduleTokenRefresh(access_token, response.data.access_token_expires);
    } catch (error) {
      console.error("Error refreshing token:", error);
      // Handle error (e.g., logout user, show error message)
    }
  }, [setToken, scheduleTokenRefresh]);

  // Function to initialize token refresh
  const initializeTokenRefresh = useCallback(async (initialToken, expiresIn) => {
    await scheduleTokenRefresh(initialToken, expiresIn);
  }, [scheduleTokenRefresh]);

  // Memoized value of the refresh token context
  const contextValue = useMemo(
    () => ({
      refreshToken,
      initializeTokenRefresh,
    }),
    [refreshToken, initializeTokenRefresh]
  );

  // Provide the refresh token context to the children components
  return (
    <RefreshTokenContext.Provider value={contextValue}>
      {children}
    </RefreshTokenContext.Provider>
  );
};

// Custom hook to easily access the refresh token context
export const useRefreshToken = () => {
  return useContext(RefreshTokenContext);
};

export default RefreshTokenProvider;
