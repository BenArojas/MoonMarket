import { CssBaseline } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import Routes from "./Routes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthProvider.jsx";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from "./contexts/ThemeContext";
import "@/styles/index.css";
import MobileBlocker from "@/pages/MobileBlocker"; // Import the MobileBlocker

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        {/* <MobileBlocker /> */}
        <CssBaseline />
        <Routes />
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={true}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </AuthProvider>
    </ThemeProvider>
    {/* <ReactQueryDevtools /> */}
  </QueryClientProvider>
);