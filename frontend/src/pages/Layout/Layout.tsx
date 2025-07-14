import Sidebar from "@/pages/Layout/Sidebar";
import { PercentageChange, PercentageChangeProvider } from "@/contexts/PercentageChangeContext";
import "@/styles/global.css";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Greetings from "./Greetings";
import { WebSocketManager } from "@/hooks/WebSocketManager";
import { useStockStore } from "@/stores/stockStore";
import { useQuery } from "@tanstack/react-query";
import { checkAiFeatures } from "@/api/user";

const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const setAreAiFeaturesEnabled = useStockStore((s) => s.setAreAiFeaturesEnabled);
  const { data } = useQuery({
    queryKey: ["aiFeatureCheck"],
    queryFn: checkAiFeatures,
    staleTime: Infinity, // We only need to check this once per session
    retry: false, // Don't retry on failure
  });
  
  useEffect(() => {
    if (data) {
      setAreAiFeaturesEnabled(data.enabled);
    }
  }, [data, setAreAiFeaturesEnabled]);


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