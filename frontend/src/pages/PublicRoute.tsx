// PublicRoute.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const PublicRoute: React.FC = () => {
  const { isAuth, isLoading, isError } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isError && isAuth === true) {
    // If the user is authenticated, redirect to the "from" location or default to "/home"
    const from = location.state?.from?.pathname || "/home";
    return <Navigate to={from} replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <Button
        className="w-64 bg-blue-600 hover:bg-blue-700 text-white mb-4"
        onClick={() => window.open('https://localhost:5000', '_blank')}
      >
        <Rocket className="mr-2 h-4 w-4" />
        Login to IBKR
      </Button>
      <Button
        variant="outline"
        className="w-64"
        onClick={() => queryClient.invalidateQueries({ queryKey: ["authStatus"] })}
      >
        Check Login Status
      </Button>
    </div>
  );
};