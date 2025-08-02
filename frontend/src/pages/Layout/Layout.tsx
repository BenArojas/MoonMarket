import { checkAiFeatures, fetchBalances, fetchPnlSnapshot } from "@/api/user";
import { PercentageChangeProvider } from "@/contexts/PercentageChangeContext";
import { WebSocketManager } from "@/hooks/WebSocketManager";
import Sidebar from "@/pages/Layout/Sidebar";
import { useStockStore } from "@/stores/stockStore";
import "@/styles/global.css";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Greetings from "./Greetings";
import { LedgerDTO } from "@/types/user";


const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const setAreAiFeaturesEnabled = useStockStore((s) => s.setAreAiFeaturesEnabled);
  const { setInitialCoreTotals } = useStockStore();
  const selectedAccountId = useStockStore((state) => state.selectedAccountId);


  const { data } = useQuery({
    queryKey: ["aiFeatureCheck"],
    queryFn: checkAiFeatures,
    staleTime: Infinity, // We only need to check this once per session
    retry: false, // Don't retry on failure
  });

  const { data: pnlData } = useQuery({
    queryKey: ['pnlSnapshot', selectedAccountId],
    queryFn: () => fetchPnlSnapshot(selectedAccountId!),
    enabled: !!selectedAccountId, // Only run when we have an account ID
    refetchOnWindowFocus: false,
  });


  const {} = useQuery<LedgerDTO | undefined, Error>({ 
    queryKey: ["balances", selectedAccountId], 
    queryFn: () => fetchBalances(selectedAccountId),
    enabled: !!selectedAccountId, 
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // 2. A useEffect hook handles the side effect of updating the store.
  useEffect(() => {
    if (pnlData) {
      setInitialCoreTotals({
        dailyRealized: pnlData.dailyRealized,
        unrealized: pnlData.unrealized,
        netLiq: pnlData.netLiq,
        marketValue: pnlData.marketValue,       // Pass new fields
        equityWithLoanValue: pnlData.equityWithLoanValue, // Pass new fields
      });
    }
  }, [pnlData, setInitialCoreTotals]);
  
  useEffect(() => {
    if (data) {
      setAreAiFeaturesEnabled(data.enabled);
    }
  }, [data, setAreAiFeaturesEnabled, selectedAccountId]);


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