import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthProvider";
import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";


export const PublicRoute = () => {
  const { token } = useAuth();
  const { forceDarkMode } = useTheme();
  useEffect(() => {
    forceDarkMode();
  }, [forceDarkMode]);

  return token ? <Navigate to="/portfolio" /> : <Outlet />
};