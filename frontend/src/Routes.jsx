import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import {
  ProtectedRoute,
  loader as ProtectedRouteLoader,
} from "@/pages/ProtectedRoute";
import App, { action as appAction, loader as appLoader } from "@/pages/App";
import ErrorPage from "@/pages/ErrorPage";
import StockPage, { loader as stockPageLoader } from "@/pages/StockPage";
import StockItem, { loader as stockItemLoader } from "@/pages/StockItem";
import Login from "@/pages/Login";
import Logout from "@/pages/Logout";
import { PublicRoute } from "@/pages/PublicRoute";
import Profile, { loader as profileLoader } from "@/pages/Profile";
import Transactions, {
  loader as transactionsLoader,
} from "@/pages/Transactions";
import { action as profileAction } from "@/components/ProfileTabs";
import Register from "@/pages/Register";
import Space, { loader as spaceLoader } from "@/pages/Space";
import "./styles/global.css";
const Routes = () => {
  const { token } = useAuth();

  // const boundAction = async (args) => {
  //   try {
  //     const result = await profileAction(args, token);
  //     return result;
  //   } catch (error) {
  //     console.error("Error in boundAction:", error);
  //     throw error;
  //   }
  // };

  // Combine and conditionally include routes based on authentication status
  const router = createBrowserRouter([
    {
      path: "/",
      element: <ProtectedRoute />,
      loader: ProtectedRouteLoader(token),
      // action: ProtectedRouteAction,
      errorElement: <ErrorPage />,
      children: [
        {
          path: "/portfolio",
          element: <App />,
          errorElement: <ErrorPage />,
          loader: appLoader(token),
          action: appAction,
        },
        {
          path: "/profile",
          element: <Profile />,
          errorElement: <ErrorPage />,
          loader: profileLoader(token),
          action: profileAction,
        },
        {
          path: "/transactions",
          element: <Transactions />,
          errorElement: <ErrorPage />,
          loader: transactionsLoader(token),
        },
        {
          path: "/space",
          element: <Space />,
          loader: spaceLoader(token),
          errorElement: <ErrorPage />,
        },
        {
          path: "portfolio/:stockTicker",
          element: <StockPage />,
          errorElement: <ErrorPage />,
          loader: async ({ params }) => {
            return stockPageLoader(params.stockTicker, token);
          },
        },
        {
          path: "/logout",
          element: <Logout />,
        },
        {
          path: "stock/:stockTicker",
          element: <StockItem />,
          errorElement: <ErrorPage />,
          loader: ({ params }) => {
            return stockItemLoader(params.stockTicker, token);
          },
        },
      ],
    },
    {
      path: "/",
      element: <PublicRoute />,
      errorElement: <ErrorPage />,
      children: [
        {
          path: "/login",
          element: <Login />,
          errorElement: <ErrorPage />,
        },
        {
          path: "/register",
          element: <Register />,
          errorElement: <ErrorPage />,
        },
      ],
    },
  ]);

  // Provide the router configuration using RouterProvider
  return <RouterProvider router={router} />;
};

export default Routes;
