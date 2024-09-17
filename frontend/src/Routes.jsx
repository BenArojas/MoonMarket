import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/pages/ProtectedRoute";
import Portfolio from "@/pages/Portfolio";
import ErrorPage from "@/pages/ErrorPage";
import StockItem, { loader as stockItemLoader } from "@/pages/StockItem";
import Login from "@/pages/Login";
import { PublicRoute } from "@/pages/PublicRoute";
import Profile from "@/pages/Profile";
import Transactions, {
  loader as transactionsLoader,
} from "@/pages/Transactions";
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
              loader: transactionsLoader,
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
