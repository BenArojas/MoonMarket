import Sidebar from "@/pages/Layout/Sidebar";
import { PercentageChange, PercentageChangeProvider } from "@/contexts/PercentageChangeContext";
import "@/styles/global.css";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Greetings from "./Greetings";
import { WebSocketManager } from "@/hooks/WebSocketManager";

const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <PercentageChangeProvider>
      <Box sx={{ display: "flex" }}>
        {/* 2. Add the WebSocketManager here. It renders no UI. */}
        <WebSocketManager />

        {isMobileScreen ? null : <Sidebar />}
        <Box
          className="layout"
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Greetings />
          <Outlet />
        </Box>
      </Box>
      </PercentageChangeProvider>
  );
};

export default Layout;