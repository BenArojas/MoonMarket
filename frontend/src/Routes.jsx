import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { ProtectedRoute, loader as ProtctedRouteLoader } from "@/pages/ProtectedRoute";
import { PublicRoute, loader as PublicRouteLoader } from "@/pages/PublicRoute";
import Portfolio from "@/pages/Portfolio";
import ErrorPage from "@/pages/ErrorPage";
import StockItem, { loader as stockItemLoader } from "@/pages/StockItem";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import Transactions from "@/pages/Transactions";
import Register from "@/pages/Register";
import Space, { loader as spaceLoader } from "@/pages/Space";
import Test from "@/pages/Test";
import "./styles/global.css";
import Layout from "@/pages/Layout";
import Global from "@/pages/Global";

const Routes = () => {
  // Combine and conditionally include routes based on authentication status
  const router = createBrowserRouter([
    {
      element: <ProtectedRoute />,
      loader: ProtctedRouteLoader,
      children: [
        {
          element: <Layout />,
          path: "/",
          children: [
            {
              path: "/home",
              element: <Portfolio />,
              errorElement: <ErrorPage />,
            },
            {
              path: "/profile",
              element: <Profile />,
              // loader: profileLoader,
              // action: profileAction,
            },
            {
              path: "/transactions",
              element: <Transactions />,
              errorElement: <ErrorPage />,
              // loader: transactionsLoader,
            },
            {
              path: "/space",
              element: <Space />,
              loader: spaceLoader,
              errorElement: <ErrorPage />,
            },
            {
              path: "/test",
              element: <Test />,
            },
            {
              path: "/global",
              element: <Global />,
            },
            {
              path: "stock/:stockTicker",
              element: <StockItem />,
              errorElement: <ErrorPage />,
              loader: stockItemLoader,
            },
          ],
        },
      ],
    },
    {
      element: <PublicRoute />,
      loader: PublicRouteLoader,
      path: "/",
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
    {
      path: "*",
      element: <div style={{ color: "white" }}>404 - Not Found</div>,
    },
  ]);

  // Provide the router configuration using RouterProvider
  return <RouterProvider router={router} />;
};

export default Routes;
