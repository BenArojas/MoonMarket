// ProtectedRoute.tsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
// No need to import useStockData anymore

export const ProtectedRoute: React.FC = () => {
  const { isAuth, isLoading, isError } = useAuth();



  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError || isAuth === false) {
    return <Navigate to="/" replace state={{ from: window.location.pathname }} />;
  }

  return <Outlet />; // This will render your <Layout />, etc.
};