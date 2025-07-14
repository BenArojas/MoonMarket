import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/pages/ProtectedRoute";
import { PublicRoute } from "@/pages/PublicRoute";
import Layout from "@/pages/Layout/Layout";
import NotFoundPage from "@/pages/NotFoundPage";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy } from "react";
import { Paths } from "@/constants/paths";

// Lazy-load pages for better performance
const Portfolio = lazy(() => import("@/pages/Portfolio/Portfolio"));
const AccountSelectionPage = lazy(() => import("@/pages/AccountSelection/AccountSelectionPage"));
const Profile = lazy(() => import("@/pages/Profile/Profile"));
const Global = lazy(() =>  import("@/pages/Global/Global"))
const Scanner = lazy(() =>  import("@/pages/Scanner/Scanner"))
const Transactions = lazy(() =>  import("@/pages/Transactions/Transactions"))
const Watchlist = lazy(() =>  import("@/pages/Watchlist/Watchlist"))


const router = createBrowserRouter([
  // --- PUBLIC ZONE ---
  {
    path: Paths.public.login,
    element: <PublicRoute />,
  },

  // --- PROTECTED ZONE ---
  {
    element: <ProtectedRoute />,
    children: [
      // Route A: Main application with Layout
      {
        element: <Layout />,
        children: [
          { path: Paths.protected.app.home, element: <Portfolio /> },
          { path: Paths.protected.app.profile, element: <Profile /> },
          { path: Paths.protected.app.global, element: <Global /> },
          { path: Paths.protected.app.scanner, element: <Scanner /> },
          { path: Paths.protected.app.transactions, element: <Transactions /> },
          { path: Paths.protected.app.watchlist, element: <Watchlist /> },
          {
            path: Paths.protected.app.stockBase, // Use the base definition
            async lazy() {
              const { default: StockItem, loader } = await import("@/pages/StockItem/StockItem");
              const { ErrorFallback } = await import("@/components/ErrorFallBack");
              return {
                Component: StockItem,
                loader: loader,
                ErrorBoundary: ErrorFallback,
              };
            },
          },
        ],
      },
      // Route B: Account Selection page without Layout
      {
        path: Paths.protected.accountSelection,
        element: <AccountSelectionPage />,
      },
    ],
  },

  // --- FALLBACK ---
  {
    path: Paths.notFound,
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
