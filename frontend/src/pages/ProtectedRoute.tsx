// src/pages/ProtectedRoute.tsx (CORRECTED)

import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useStockStore } from "@/stores/stockStore";
import { Paths } from "@/constants/paths";


const useIsHydrated = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // A Zustand trick to check if hydration is complete.
    const unsub = useStockStore.persist.onFinishHydration(() => setHydrated(true));

    // Fallback for immediate hydration
    if (useStockStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    
    return () => {
      unsub();
    };
  }, []);

  return hydrated;
};

export const ProtectedRoute: React.FC = () => {
  const { isAuth, isLoading: isAuthLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Get the selected account ID directly
  const selectedAccountId = useStockStore((state) => state.selectedAccountId);
  
  // Use our new hook to check hydration status
  const isHydrated = useIsHydrated();

  useEffect(() => {
    // Wait until auth is checked AND the store is hydrated
    if (isAuthLoading || !isHydrated) {
      return;
    }

    // Now all your navigation logic will work correctly without race conditions.
    if (!isAuth) {
      navigate(Paths.public.login, { replace: true, state: { from: location } });
      return;
    }

    if (selectedAccountId && location.pathname === Paths.protected.accountSelection) {
      navigate(Paths.protected.app.home, { replace: true });
    }
    else if (!selectedAccountId && location.pathname !== Paths.protected.accountSelection) {
      navigate(Paths.protected.accountSelection, { replace: true });
    }
  }, [isAuth, isAuthLoading, selectedAccountId, isHydrated, location, navigate]);

  // Our single, reliable loading gate
  if (isAuthLoading || !isHydrated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return <Outlet />;
};