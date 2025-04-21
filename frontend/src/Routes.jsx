import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/pages/ProtectedRoute";
import { PublicRoute } from "@/pages/PublicRoute";
import Layout from "@/pages/Layout";
import NotFoundPage from "@/pages/NotFoundPage";
import ErrorPage from '@/pages/ErrorPage'

const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        path: "/",
        children: [
          {
            index: true,
            element: <Navigate to="/home" replace />,
          },
          {
            path: "/home",
            async lazy() {
              const { default: Portfolio, loader } = await import("@/pages/Portfolio");
              return {
                Component: Portfolio,
                loader,
                ErrorBoundary: (await import("@/components/ErrorFallBack")).default
              };
            }
          },
          {
            path: "/profile",
            async lazy() {
              const { default: Profile } = await import("@/pages/Profile");
              return { Component: Profile };
            }
          },
          {
            path: "/watchlist",
            async lazy() {
              const { default: Watchlist } = await import("@/pages/Watchlist");
              return { Component: Watchlist };
            }
          },
          {
            path: "/transactions",
            async lazy() {
              const { default: Transactions } = await import("@/pages/Transactions");
              return {
                Component: Transactions,
                ErrorBoundary: (await import("@/components/ErrorFallBack")).default
              };
            }
          },
          {
            path: "/space",
            async lazy() {
              const { default: Space } = await import("@/pages/Space");
              return {
                Component: Space,
                ErrorBoundary: (await import("@/components/ErrorFallBack")).default
              };
            }
          },
          {
            path: "/test",
            async lazy() {
              const { default: Test } = await import("@/pages/Test");
              return { Component: Test };
            }
          },
          {
            path: "/global",
            async lazy() {
              const { default: Global } = await import("@/pages/Global");
              return { Component: Global };
            }
          },
          {
            path: "stock/:stockTicker",
            async lazy() {
              const { default: StockItem, loader } = await import("@/pages/StockItem");
              return {
                Component: StockItem,
                loader,
                ErrorBoundary: (await import("@/components/ErrorFallBack")).default
              };
            }
          }
        ],
      },
    ],
  },
  {
    element: <PublicRoute />,
    path: "/",
    errorElement: <ErrorPage />,
    async lazy() {
      const { default: ErrorPage } = await import("@/components/ErrorFallBack");
      return { ErrorBoundary: ErrorPage };
    },
    children: [
      {
        path: "/login",
        async lazy() {
          const { default: Login } = await import("@/pages/Login");
          return {
            Component: Login,
            ErrorBoundary: (await import("@/components/ErrorFallBack")).default
          };
        }
      },
      {
        path: "/register",
        async lazy() {
          const { default: Register } = await import("@/pages/Register");
          return {
            Component: Register,
            ErrorBoundary: (await import("@/components/ErrorFallBack")).default
          };
        }
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />
  },
]);

const Routes = () => {
  return <RouterProvider router={router} />;
};

export default Routes;