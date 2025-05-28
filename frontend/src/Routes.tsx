import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/pages/ProtectedRoute";
import { PublicRoute } from "@/pages/PublicRoute";
import Layout from "@/pages/Layout";
import NotFoundPage from "@/pages/NotFoundPage";
import { AuthProvider } from "@/contexts/AuthContext";

interface LazyRouteComponent {
  Component: React.ComponentType;
  loader?: () => Promise<any>;
  ErrorBoundary?: React.ComponentType<{ error: Error }>;
}

const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    path: "/",
    index: true, // Public route at root
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        path: "/",
        children: [
          {
            path: "/home",
            async lazy(): Promise<LazyRouteComponent> {
              const { default: Portfolio, loader } = await import("@/pages/Portfolio");
              return {
                Component: Portfolio,
                loader,
                ErrorBoundary: (await import("@/components/ErrorFallBack")).default,
              };
            },
          },
          {
            path: "/profile",
            async lazy(): Promise<LazyRouteComponent> {
              const { default: Profile } = await import("@/pages/Profile");
              return { Component: Profile };
            },
          },
          {
            path: "/watchlist",
            async lazy(): Promise<LazyRouteComponent> {
              const { default: Watchlist } = await import("@/pages/Watchlist");
              return { Component: Watchlist };
            },
          },
          {
            path: "/transactions",
            async lazy(): Promise<LazyRouteComponent> {
              const { default: Transactions } = await import("@/pages/Transactions");
              return {
                Component: Transactions,
                ErrorBoundary: (await import("@/components/ErrorFallBack")).default,
              };
            },
          },
          {
            path: "/space",
            async lazy(): Promise<LazyRouteComponent> {
              const { default: Space } = await import("@/pages/Space");
              return {
                Component: Space,
                ErrorBoundary: (await import("@/components/ErrorFallBack")).default,
              };
            },
          },
          {
            path: "/global",
            async lazy(): Promise<LazyRouteComponent> {
              const { default: Global } = await import("@/pages/Global");
              return { Component: Global };
            },
          },
          {
            path: "/stock/:stockTicker",
            async lazy(): Promise<LazyRouteComponent> {
              const { default: StockItem, loader } = await import("@/pages/StockItem");
              return {
                Component: StockItem,
                loader,
                ErrorBoundary: (await import("@/components/ErrorFallBack")).default,
              };
            },
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

const Routes = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};

export default Routes;