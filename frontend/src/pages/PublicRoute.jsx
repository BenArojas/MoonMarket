import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthProvider";
import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";


export const PublicRoute = ({ children }) => {
  const { isAuthenticated, checkAuthStatus } = useAuth();
  const location = useLocation();

  useEffect(() => {
    checkAuthStatus();
  }, [isAuthenticated]);
  
  const { forceDarkMode } = useTheme(); 
  useEffect(() => {
    forceDarkMode();
  }, [forceDarkMode]);

  if (isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/portfolio" state={{ from: location }} replace />;
  }

  return <Outlet/>;
};