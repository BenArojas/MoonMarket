  // ProtectedRoute.jsx
  import React from 'react';
  import { Navigate, useLocation, Outlet } from 'react-router-dom';
  import { useAuth } from '@/contexts/AuthProvider';

  export const ProtectedRoute = () => {
    const { isAuthenticated, checkAuthStatus } = useAuth();
    const location = useLocation();


    React.useEffect(() => {
      checkAuthStatus();
    }, [isAuthenticated]);

    if (!isAuthenticated) {
      // Redirect them to the /login page, but save the current location they were
      // trying to go to when they were redirected. This allows us to send them
      // along to that page after they login, which is a nicer user experience
      // than dropping them off on the home page.
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;

  };