// PublicRoute.jsx
import React from 'react';
import { Outlet, Navigate, useLocation, Location } from 'react-router-dom';
import { useQuery } from "@tanstack/react-query";
import { fetchAuthStatus } from '@/api/auth';
import type { UserData } from '@/contexts/UserContext';

export const PublicRoute: React.FC = () => {
  const location: Location = useLocation();
  const { 
    data: authData, 
    isLoading, 
    isError 
  } = useQuery<UserData | null>({
    queryKey: ['authStatus'],
    queryFn: fetchAuthStatus,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Consider auth status fresh for 5 minutes
  });

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isError && authData?.enabled) {
    // Redirect to the page they were trying to visit or home
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/home";
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
};