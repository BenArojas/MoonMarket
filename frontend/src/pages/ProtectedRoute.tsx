// ProtectedRoute.jsx
import React from 'react';
import { Outlet, Navigate, useLocation, Location } from 'react-router-dom';
import { useQuery } from "@tanstack/react-query";
import { fetchAuthStatus } from '@/api/auth';
import useAutoLogout from '@/hooks/useAutoLogout';
import { UserProvider } from '@/contexts/UserContext';
import type { UserData } from '@/contexts/UserContext';

export const ProtectedRoute: React.FC = () => {
  const location: Location = useLocation();
  const { 
    data: userData, 
    isLoading, 
    isError 
  } = useQuery<UserData | null>({
    queryKey: ['authStatus'],
    queryFn: fetchAuthStatus,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  useAutoLogout();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (isError) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <UserProvider userData={userData ?? null}>
      <Outlet />
    </UserProvider>
  );
};  