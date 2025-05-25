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
      <p className="mb-4 text-lg">Please log in to your IBKR account</p>
      <Button
        onClick={() => window.open("https://localhost:5055", "_blank")}
        className="w-64 bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Rocket className="mr-2 h-4 w-4" />
        Open IBKR Gateway Login
      </Button>
      <Button
        onClick={async () => {
          // Wait a few seconds for login to complete
          await new Promise((res) => setTimeout(res, 2000));
          // Refetch auth status
          queryClient.invalidateQueries({ queryKey: ["authStatus"] });
        }}
      >
        I logged in – Continue
      </Button>
    </div>
  );
};