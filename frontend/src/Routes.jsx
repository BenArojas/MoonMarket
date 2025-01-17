import React from 'react'
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/pages/ProtectedRoute";
import { PublicRoute } from "@/pages/PublicRoute";
import { Suspense } from "react";
import "./styles/global.css";
import Layout from "@/pages/Layout";
import Global from "@/pages/Global";
import NotFoundPage from "@/pages/NotFoundPage";

// Lazy load your components
const Portfolio = React.lazy(() => import("@/pages/Portfolio"));
const ErrorPage = React.lazy(() => import("@/pages/ErrorPage"));
const StockItem = React.lazy(() => import("@/pages/StockItem"));
const Login = React.lazy(() => import("@/pages/Login"));
const Profile = React.lazy(() => import("@/pages/Profile"));
const Transactions = React.lazy(() => import("@/pages/Transactions"));
const Register = React.lazy(() => import("@/pages/Register"));
const Space = React.lazy(() => import("@/pages/Space"));
const Test = React.lazy(() => import("@/pages/Test"));

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
              element: <Suspense fallback={<div>Loading...</div>}><Portfolio /></Suspense>,
              errorElement: <Suspense fallback={<div>Loading...</div>}><ErrorPage /></Suspense>,
            },
            {
              path: "/profile",
              element: <Suspense fallback={<div>Loading...</div>}><Profile /></Suspense>,
            },
            {
              path: "/transactions",
              element: <Suspense fallback={<div>Loading...</div>}><Transactions /></Suspense>,
              errorElement: <Suspense fallback={<div>Loading...</div>}><ErrorPage /></Suspense>,
            },
            {
              path: "/space",
              element: <Suspense fallback={<div>Loading...</div>}><Space /></Suspense>,
              errorElement: <Suspense fallback={<div>Loading...</div>}><ErrorPage /></Suspense>,
            },
            {
              path: "/test",
              element: <Suspense fallback={<div>Loading...</div>}><Test /></Suspense>,
            },
            {
              path: "/global",
              element: <Suspense fallback={<div>Loading...</div>}><Global /></Suspense>,
            },
            {
              path: "stock/:stockTicker",
              element: <Suspense fallback={<div>Loading...</div>}><StockItem /></Suspense>,
              errorElement: <Suspense fallback={<div>Loading...</div>}><ErrorPage /></Suspense>,
              loader: stockItemLoader,
            },
          ],
        },
      ],
    },
    {
      element: <PublicRoute />,
      path: "/",
      errorElement: <Suspense fallback={<div>Loading...</div>}><ErrorPage /></Suspense>,
      children: [
        {
          path: "/login",
          element: <Suspense fallback={<div>Loading...</div>}><Login /></Suspense>,
          errorElement: <Suspense fallback={<div>Loading...</div>}><ErrorPage /></Suspense>,
        },
        {
          path: "/register",
          element: <Suspense fallback={<div>Loading...</div>}><Register /></Suspense>,
          errorElement: <Suspense fallback={<div>Loading...</div>}><ErrorPage /></Suspense>,
        },
      ],
    },
    {
      path: "*",
      element: <Suspense fallback={<div>Loading...</div>}><NotFoundPage /></Suspense>,
    },
  ]);

  // Provide the router configuration using RouterProvider
  return <RouterProvider router={router} />;
};

export default Routes;
