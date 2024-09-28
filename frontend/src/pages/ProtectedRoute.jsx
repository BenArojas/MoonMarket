  // ProtectedRoute.jsx
  import React from 'react';
  import { Navigate, useLocation, Outlet, useLoaderData } from 'react-router-dom';
  import { useAuth } from '@/contexts/AuthProvider';
  import { requireAuth } from '@/utils/auth';

  export async function loader (){
    const response = await requireAuth();
    return response.enabled
  }
  export const ProtectedRoute = () => {

    const isEnabled = useLoaderData()
    
    return <Outlet context={isEnabled}/>;

  };