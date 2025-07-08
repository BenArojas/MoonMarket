import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/pages/ProtectedRoute";
import { PublicRoute } from "@/pages/PublicRoute";
import Layout from "@/pages/Layout/Layout";
import NotFoundPage from "@/pages/NotFoundPage";
import { AuthProvider } from "@/contexts/AuthContext";



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
            async lazy() {
              const { default: Portfolio } = await import("@/pages/Portfolio/Portfolio");
              return {
                Component: Portfolio,
                ErrorBoundary: (await import("@/components/ErrorFallBack")),
              };
            },
          },
          {
            path: "/profile",
            async lazy() {
              const { default: Profile } = await import("@/pages/Profile/Profile");
              return { Component: Profile };
            },
          },
          {
            path: "/watchlist",
            async lazy() {
              const { default: Watchlist } = await import("@/pages/Watchlist/Watchlist");
              return { Component: Watchlist };
            },
          },
          {
            path: "/transactions",
            async lazy() {
              const { default: Transactions } = await import("@/pages/Transactions/Transactions");
              return {
                Component: Transactions,
                ErrorBoundary: (await import("@/components/ErrorFallBack")),
              };
            },
          },
          {
            path: "/space",
            async lazy() {
              const { default: Space } = await import("@/pages/Space");
              return {
                Component: Space,
                ErrorBoundary: (await import("@/components/ErrorFallBack")),
              };
            },
          },
          {
            path: "/scanner",
            async lazy() {
              const { default: Space } = await import("@/pages/Scanner/Scanner");
              return {
                Component: Space,
                ErrorBoundary: (await import("@/components/ErrorFallBack")),
              };
            },
          },
          {
            path: "/global",
            async lazy() {
              const { default: Global } = await import("@/pages/Global/Global");
              return { Component: Global };
            },
          },
          {
            path: "/stock/:stockTicker",
            async lazy() {
              const { default: StockItem, loader } = await import("@/pages/StockItem/StockItem");
              return {
                Component: StockItem,
                loader,
                ErrorBoundary: (await import("@/components/ErrorFallBack")),
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