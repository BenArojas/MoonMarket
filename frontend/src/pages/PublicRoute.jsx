// PublicRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';
import { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export const PublicRoute = () => {
  const { isAuthenticated, checkAuthStatus } = useAuth();

  useEffect(() => {
    checkAuthStatus();
  }, []); // Ensure to call checkAuthStatus on mount

  const { forceDarkMode } = useTheme();
  useEffect(() => {
    forceDarkMode();
  }, [forceDarkMode]);

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
};
