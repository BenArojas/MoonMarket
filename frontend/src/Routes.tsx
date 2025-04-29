import { RouterProvider, createBrowserRouter, Navigate, RouteObject } from "react-router-dom";
import { ProtectedRoute } from "@/pages/ProtectedRoute";
import { PublicRoute } from "@/pages/PublicRoute";
import Layout from "@/pages/Layout";
import NotFoundPage from "@/pages/NotFoundPage";

interface LazyRouteComponent {
  Component: React.ComponentType;
  loader?: () => Promise<any>;
  ErrorBoundary?: React.ComponentType<{ error: Error }>;
}

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
            async lazy(): Promise<LazyRouteComponent> {
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
            async lazy(): Promise<LazyRouteComponent> {
              const { default: Profile } = await import("@/pages/Profile");
              return { Component: Profile };
            }
          },
          {
            path: "/watchlist",
            async lazy(): Promise<LazyRouteComponent> {
              const { default: Watchlist } = await import("@/pages/Watchlist");
              return { Component: Watchlist };
            }
          },
          {
            path: "/transactions",
            async lazy(): Promise<LazyRouteComponent> {
              const { default: Transactions } = await import("@/pages/Transactions");
              return {
                Component: Transactions,
                ErrorBoundary: (await import("@/components/ErrorFallBack")).default
              };
            }
          },
          {
            path: "/space",
            async lazy(): Promise<LazyRouteComponent> {
              const { default: Space } = await import("@/pages/Space");
              return {
                Component: Space,
                ErrorBoundary: (await import("@/components/ErrorFallBack")).default
              };
            }
          },
          // {
          //   path: "/test",
          //   async lazy(): Promise<LazyRouteComponent> {
          //     const { default: Test } = await import("@/pages/Test");
          //     return { Component: Test };
          //   }
          // },
          {
            path: "/global",
            async lazy(): Promise<LazyRouteComponent> {
              const { default: Global } = await import("@/pages/Global");
              return { Component: Global };
            }
          },
          {
            path: "stock/:stockTicker",
            async lazy(): Promise<LazyRouteComponent> {
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
    async lazy(): Promise<LazyRouteComponent> {
      const { default: Login } = await import("@/pages/Login.tsx");
      return {
        Component: Login,
        ErrorBoundary: (await import("@/components/ErrorFallBack")).default };
    },
    children: [
      {
        path: "/login",
        async lazy(): Promise<LazyRouteComponent> {
          const { default: Login } = await import("@/pages/Login.tsx");
          return {
            Component: Login,
            ErrorBoundary: (await import("@/components/ErrorFallBack")).default
          };
        }
      },
      {
        path: "/register",
        async lazy(): Promise<LazyRouteComponent> {
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
]as RouteObject[]);

const Routes = () => {
  return <RouterProvider router={router} />;
};

export default Routes;