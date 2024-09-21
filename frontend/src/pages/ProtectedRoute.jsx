  // ProtectedRoute.jsx
  import React from 'react';
  import { Navigate, useLocation, Outlet } from 'react-router-dom';
  import { useAuth } from '@/contexts/AuthProvider';
  import { requireAuth } from '@/utils/auth';

  export async function loader (){
    const username = await requireAuth();
    return username
  }
  export const ProtectedRoute = () => {

    return <Outlet />;

  };