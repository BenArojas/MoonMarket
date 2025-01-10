// PublicRoute.jsx
import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from "@tanstack/react-query";
import { fetchAuthStatus } from '@/api/auth';

export const PublicRoute = () => {
  const location = useLocation();
  const { data: authData, isLoading, isError, status } = useQuery({
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
    const from = location.state?.from?.pathname || "/home";
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
};