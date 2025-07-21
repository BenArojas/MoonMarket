import { startTransition, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ChartBar, InitialQuoteData, useStockStore } from "@/stores/stockStore";
import api from "@/api/axios";

import { Box, Button, ButtonGroup, CircularProgress, Typography } from "@mui/material";
import LiveQuoteDisplay from "./LiveQuoteDisplay";
import CandleStickChart from "@/components/charts/CandleSticksChart";
import OrderPanel from "./OrderPanel";
import DepthOfBookTable from "./DepthOfBookTable";

const timePeriods = ["1D", "7D", "1M", "3M", "YTD", "1Y", "5Y"];

export default function StockItem() {
  const { conid: conidFromUrl } = useParams<{ conid: string }>();
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("7D");
  const location = useLocation();

  const activeStock = useStockStore((state) => state.activeStock);
  const setInitialQuote = useStockStore((state) => state.setInitialQuote);
  const setInitialChartData = useStockStore((state) => state.setInitialChartData); // Assuming this is the correct function
  const subscribeToStock = useStockStore((state) => state.subscribeToStock);
  const unsubscribeFromStock = useStockStore((state) => state.unsubscribeFromStock);
  const subscribeToChart = useStockStore((state) => state.subscribeToChart);
  const unsubscribeFromChart = useStockStore((state) => state.unsubscribeFromChart);
  const setPreloadedDetails = useStockStore((state) => state.setPreloadedDetails);

  const conid = conidFromUrl ? parseInt(conidFromUrl, 10) : null;

  // --- EFFECT 1: Handles initial quote and live subscriptions ---
  // This runs only when the stock's conid changes.
  useEffect(() => {
    if (!conid) return;

    const preloadedState = location.state as { companyName: string; ticker: string } | null;
    if (preloadedState) {
        startTransition(() => {
            setPreloadedDetails({ conid, ...preloadedState });
        });
    }

    const setupSubscriptions = async () => {
      try {
        // Fetch initial quote data once
        const quoteResponse = await api.get<InitialQuoteData>(`/market/quote/${conid}`);
        startTransition(() => {
          setInitialQuote(quoteResponse.data);
          // Subscribe to live updates
          subscribeToStock(conid);
          // subscribeToChart(conid);
        });
      } catch (error) {
        console.error("Failed to fetch initial quote:", error);
      }
    };

    setupSubscriptions();

    // Cleanup function: Unsubscribe when the component unmounts or conid changes
    return () => {
      unsubscribeFromStock(conid);
      // unsubscribeFromChart(conid);
    };
    // This effect should only re-run if the conid itself changes
  }, [conid, setInitialQuote, subscribeToStock, unsubscribeFromStock, subscribeToChart, unsubscribeFromChart]);


  // --- EFFECT 2: Handles fetching historical chart data ---
  // This runs whenever the conid or the selectedPeriod changes.
  useEffect(() => {
    if (!conid) return;

    const fetchChartData = async () => {
      setIsChartLoading(true);
      try {
        const historyResponse = await api.get<ChartBar[]>("/market/history", {
          params: { conid, period: selectedPeriod },
        });
        
        // BUG FIX: Set the chart data in the store with the fetched data
        startTransition(() => {
          setInitialChartData(historyResponse.data);
        });

      } catch (error) {
        console.error("Failed to fetch chart history:", error);
        // Optionally clear data or show an error state
        startTransition(() => {
          setInitialChartData([]); 
        });
      } finally {
        startTransition(() => setIsChartLoading(false));
      }
    };

    fetchChartData();
    // This effect depends on the selected time period
  }, [conid, selectedPeriod, setInitialChartData]);


  // Show a full-page loader only if we have no active stock data at all
  if (!activeStock.conid && isChartLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!activeStock.conid) {
    return <Typography sx={{ p: 4 }}>Stock not found or failed to load.</Typography>;
  }

  return (
    <Box className="layoutContainer" sx={{ p: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        {activeStock.companyName} ({activeStock.ticker})
      </Typography>

      <div className="main-content-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        <div className="chart-and-info">
          <LiveQuoteDisplay quote={activeStock.quote} />
          <Box sx={{ my: 2 }}>
            <ButtonGroup variant="outlined" aria-label="time period selector">
              {timePeriods.map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? "contained" : "outlined"}
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period}
                </Button>
              ))}
            </ButtonGroup>
          </Box>
          {/* This loader is now controlled by the chart-specific loading state */}
          {isChartLoading ? (
            <Box sx={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <CandleStickChart />
          )}
        </div>
        <div className="trading-panel">
          <OrderPanel conid={activeStock.conid} />
          <DepthOfBookTable depth={activeStock.depth} />
        </div>
      </div>
    </Box>
  );
}