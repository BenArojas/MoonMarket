import { CssBaseline } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import Routes from "./Routes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {AuthProvider} from "@/contexts/AuthProvider.jsx";

import { darkTheme, lightTheme } from "./theme";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from "./contexts/ThemeContext";
import "@/styles/index.css";


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

        <CssBaseline />
        <Routes />

      </AuthProvider>
    </ThemeProvider>
    <ReactQueryDevtools />
  </QueryClientProvider>

  // </React.StrictMode>
);
