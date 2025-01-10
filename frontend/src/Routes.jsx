import { RouterProvider, createBrowserRouter, Navigate  } from "react-router-dom";
import { ProtectedRoute} from "@/pages/ProtectedRoute";
import { PublicRoute } from "@/pages/PublicRoute";
import Portfolio from "@/pages/Portfolio";
import ErrorPage from "@/pages/ErrorPage";
import StockItem, { loader as stockItemLoader } from "@/pages/StockItem";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import Transactions from "@/pages/Transactions";
import Register from "@/pages/Register";
import Space from "@/pages/Space";
import Test from "@/pages/Test";
import "./styles/global.css";
import Layout from "@/pages/Layout";
import Global from "@/pages/Global";

const Routes = () => {
  // Combine and conditionally include routes based on authentication status
  const router = createBrowserRouter([
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <Layout />,
          path: "/",
          children: [
            {
              index: true, // This marks it as the index route
              element: <Navigate to="/home" replace />, // Redirect from / to /home
            },
            {
              path: "/home",
              element: <Portfolio />,
              errorElement: <ErrorPage />,
            },
            {
              path: "/profile",
              element: <Profile />,
            },
            {
              path: "/transactions",
              element: <Transactions />,
              errorElement: <ErrorPage />,
            },
            {
              path: "/space",
              element: <Space />,
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