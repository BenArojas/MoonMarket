  // ProtectedRoute.jsx
  import React from 'react';
  import { Outlet, useLoaderData } from 'react-router-dom';
  import { requireAuth } from '@/utils/auth';
  import useAutoLogout from '@/hooks/useAutoLogout'

  export async function loader (){
    const response = await requireAuth();
    return response.enabled
  }
  export const ProtectedRoute = () => {

    const isEnabled = useLoaderData()
    useAutoLogout()

    
    return <Outlet context={isEnabled}/>;

  };