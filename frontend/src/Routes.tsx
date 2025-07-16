import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/pages/ProtectedRoute";
import { PublicRoute } from "@/pages/PublicRoute";
import Layout from "@/pages/Layout/Layout";
import NotFoundPage from "@/pages/NotFoundPage";
import { AuthProvider } from "@/contexts/AuthContext";
import { Paths } from "@/constants/paths";

import Portfolio from "@/pages/Portfolio/Portfolio";
import StockItem from "@/pages/StockItem/StockItem";
import AccountSelectionPage from "@/pages/AccountSelection/AccountSelectionPage";
import Profile from "@/pages/Profile/Profile";
import Global from "@/pages/Global/Global";
import Scanner from "@/pages/Scanner/Scanner";
import Transactions from "@/pages/Transactions/Transactions";
import Watchlist from "@/pages/Watchlist/Watchlist";



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
            path: Paths.protected.app.stockBase, 
            element: <StockItem />,
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
