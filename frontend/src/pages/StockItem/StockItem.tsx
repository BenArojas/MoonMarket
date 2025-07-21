import { startTransition, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ChartBar, InitialQuoteData, useStockStore } from "@/stores/stockStore";
import api from "@/api/axios";

import {
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import LiveQuoteDisplay from "./LiveQuoteDisplay";
import CandleStickChart from "@/components/charts/CandleSticksChart";
import OrderPanel from "./OrderPanel";
import DepthOfBookTable from "./DepthOfBookTable";
import OptionsChain from "./OptionsChain";

const timePeriods = ["1D", "7D", "1M", "3M", "YTD", "1Y", "5Y"];

export default function StockItem() {
  const { conid: conidFromUrl } = useParams<{ conid: string }>();
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("7D");
  const [view, setView] = useState<"chart" | "options">("chart");
  const location = useLocation();

  const activeStock = useStockStore((state) => state.activeStock);
  const setInitialQuote = useStockStore((state) => state.setInitialQuote);
  const setInitialChartData = useStockStore(
    (state) => state.setInitialChartData
  ); // Assuming this is the correct function
  const subscribeToStock = useStockStore((state) => state.subscribeToStock);
  const unsubscribeFromStock = useStockStore(
    (state) => state.unsubscribeFromStock
  );
  const setPreloadedDetails = useStockStore(
    (state) => state.setPreloadedDetails
  );

  const conid = conidFromUrl ? parseInt(conidFromUrl, 10) : null;

  // --- EFFECT 1: Handles initial quote and live subscriptions ---
  // This runs only when the stock's conid changes.
  useEffect(() => {
    if (!conid) return;

    const preloadedState = location.state as {
      companyName: string;
      ticker: string;
    } | null;
    if (preloadedState) {
      startTransition(() => {
        setPreloadedDetails({ conid, ...preloadedState });
      });
    }

    const setupSubscriptions = async () => {
      try {
        // Fetch initial quote data once
        const quoteResponse = await api.get<InitialQuoteData>(
          `/market/quote/${conid}`
        );
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
  }, [conid, setInitialQuote, subscribeToStock, unsubscribeFromStock]);

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
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!activeStock.conid) {
    return (
      <Typography sx={{ p: 4 }}>Stock not found or failed to load.</Typography>
    );
  }

  return (
    <Box className="layoutContainer" sx={{ p: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        {activeStock.companyName} ({activeStock.ticker})
      </Typography>

      <div
        className="main-content-grid"
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}
      >
        <div className="chart-and-info">
          <LiveQuoteDisplay quote={activeStock.quote} />
          <Stack
            sx={{ my: 2 }}
            direction="row-reverse"
            justifyContent={"space-between"}
          >
            <ButtonGroup variant="outlined" aria-label="view selector">
              <Button
                variant={view === "chart" ? "contained" : "outlined"}
                onClick={() => setView("chart")}
              >
                Chart
              </Button>
              <Button
                variant={view === "options" ? "contained" : "outlined"}
                onClick={() => setView("options")}
              >
                Options
              </Button>
            </ButtonGroup>
            {view === "chart" && (
              <ButtonGroup variant="outlined" aria-label="time period selector">
                {timePeriods.map((period) => (
                  <Button
                    key={period}
                    variant={
                      selectedPeriod === period ? "contained" : "outlined"
                    }
                    onClick={() => setSelectedPeriod(period)}
                  >
                    {period}
                  </Button>
                ))}
              </ButtonGroup>
            )}
          </Stack>

          {/* This loader is now controlled by the chart-specific loading state */}
          {view === "chart" && (
            <>
              {isChartLoading ? (
                <Box
                  sx={{
                    height: 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : (
                <CandleStickChart />
              )}
            </>
          )}

          {view === "options" && (
            // You can fetch real options data here in the future
            <OptionsChain data={mockOptionsData}/>
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

export interface OptionContract {
  contractId: string;
  strike: number;
  type: 'call' | 'put';
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
}

export interface OptionsData {
  [expirationDate: string]: OptionContract[];
}

export const mockOptionsData: OptionsData = {
  "2025-07-25": [
    { contractId: 'c1', strike: 60, type: 'call', lastPrice: 6.50, bid: 6.45, ask: 6.55, volume: 120, openInterest: 1500 },
    { contractId: 'p1', strike: 60, type: 'put', lastPrice: 0.50, bid: 0.48, ask: 0.52, volume: 90, openInterest: 1200 },
    { contractId: 'c2', strike: 65, type: 'call', lastPrice: 2.80, bid: 2.78, ask: 2.82, volume: 250, openInterest: 3000 },
    { contractId: 'p2', strike: 65, type: 'put', lastPrice: 1.80, bid: 1.78, ask: 1.82, volume: 180, openInterest: 2500 },
    { contractId: 'c3', strike: 70, type: 'call', lastPrice: 0.90, bid: 0.88, ask: 0.92, volume: 300, openInterest: 4000 },
    { contractId: 'p3', strike: 70, type: 'put', lastPrice: 4.90, bid: 4.85, ask: 4.95, volume: 150, openInterest: 2000 },
  ],
  "2025-08-15": [
    { contractId: 'c4', strike: 62.5, type: 'call', lastPrice: 5.20, bid: 5.15, ask: 5.25, volume: 80, openInterest: 1000 },
    { contractId: 'p4', strike: 62.5, type: 'put', lastPrice: 1.20, bid: 1.18, ask: 1.22, volume: 60, openInterest: 800 },
    { contractId: 'c5', strike: 67.5, type: 'call', lastPrice: 2.10, bid: 2.08, ask: 2.12, volume: 150, openInterest: 2000 },
    { contractId: 'p5', strike: 67.5, type: 'put', lastPrice: 3.10, bid: 3.05, ask: 3.15, volume: 100, openInterest: 1500 },
  ],
};