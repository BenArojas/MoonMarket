import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import {
  ProtectedRoute
} from "@/pages/ProtectedRoute";
import Portfolio from "@/pages/Portfolio";
import ErrorPage from "@/pages/ErrorPage";
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
import Test from "@/pages/Test";
import "./styles/global.css";
import Layout, { loader as LayoutLoader } from "@/pages/Layout"
import { ThemeProvider } from "./contexts/ThemeContext";
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
          loader: LayoutLoader,
          errorElement: <ErrorPage />,
          children: [
            {
              path: "/home",
              element: <Portfolio />,
              errorElement: <ErrorPage />,
            },
            {
              path: "/profile",
              element: <Profile />,
              errorElement: <ErrorPage />,
              loader: profileLoader,
              action: profileAction,
            },
            {
              path: "/transactions",
              element: <Transactions />,
              errorElement: <ErrorPage />,
              loader: transactionsLoader,
            },
            {
              path: "/space",
              element:
                <Space />
              ,
              loader: spaceLoader,
              errorElement: <ErrorPage />,
            },
            {
              path: "/logout",
              element: <Logout />,
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
              loader: ({ params }) => {
                return stockItemLoader(params.stockTicker);
              },
            },
          ]
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
      element: <div style={{color: 'white'}}>404 - Not Found</div>,
    },  
  ]);

  // Provide the router configuration using RouterProvider
  return <RouterProvider router={router} />;
};

export default Routes;
