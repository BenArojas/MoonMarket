// ProtectedRoute.tsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useStockStore } from "@/stores/stockStore";
import { Paths } from "@/constants/paths";

export const ProtectedRoute: React.FC = () => {
    const { isAuth, isLoading } = useAuth();
    const selectedAccountId = useStockStore((state) => state.selectedAccountId);
    const location = useLocation();
    const isAtAccountSelection = location.pathname === Paths.protected.accountSelection;



  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuth) {
  return <Navigate to={Paths.public.login} replace state={{ from: location }} />;
}

  // If authenticated but no account is selected, force user to the selection page
  if (!selectedAccountId && !isAtAccountSelection) {
    return <Navigate to={Paths.protected.accountSelection} replace />;
  }

  // If an account is selected and user is on the selection page, redirect to home
  if (selectedAccountId && isAtAccountSelection) {
    // Construct the full path to home
    const homePath = `/${Paths.protected.app.base}/${Paths.protected.app.home}`;
    return <Navigate to={homePath} replace />;
  }

  return <Outlet />; 
};