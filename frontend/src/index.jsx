import { CssBaseline } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import "@/styles/index.css";
import Routes from "./Routes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthProvider from "@/contexts/AuthProvider.jsx";
import RefreshTokenProvider from "@/contexts/RefreshTokenProvider.jsx";
import { darkTheme, lightTheme } from "./theme";
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'
import { ThemeProvider } from "./contexts/ThemeContext";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // <React.StrictMode>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <RefreshTokenProvider>
          <CssBaseline />
          <Routes />
        </RefreshTokenProvider>
      </AuthProvider>
    </ThemeProvider>
    <ReactQueryDevtools />
  </QueryClientProvider>
  // </React.StrictMode>
);
