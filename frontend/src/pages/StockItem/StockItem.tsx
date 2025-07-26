import api from "@/api/axios";
import { ChartBar, useStockStore } from "@/stores/stockStore";
import { startTransition, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import CandleStickChart from "@/components/charts/CandleSticksChart";
import {
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import DepthOfBookTable from "./DepthOfBookTable";
import LiveQuoteDisplay from "./LiveQuoteDisplay";
import OptionsChain from "./OptionsChain";
import OrderPanel from "./OrderPanel";
import { PositionDetails } from "./PositionDetails";

const timePeriods = ["1D", "7D", "1M", "3M", "YTD", "1Y", "5Y"];

// --- TYPE DEFINITIONS ---
export interface OptionContract {
  contractId: number;
  strike: number;
  type: "call" | "put";
  lastPrice?: number;
  bid?: number;
  ask?: number;
  volume?: number;
  delta?: number;
  bidSize?: number;
  askSize?: number;
}

export type OptionsChainData = Record<
  string,
  {
    call?: OptionContract;
    put?: OptionContract;
  }
>;

// Add these new types for our API responses
export interface FilteredChainResponse {
  all_strikes: number[];
  chain: OptionsChainData;
}

export interface SingleContractResponse {
  strike: number;
  data: {
    call?: OptionContract;
    put?: OptionContract;
  };
}

export interface StaticInfo {
  conid: number;
  ticker: string;
  companyName: string;
  exchange?: string;
  secType?: string;
  currency?: string;
}

export interface QuoteInfo {
  lastPrice?: number;
  bid?: number;
  ask?: number;
  changePercent?: number;
  changeAmount?: number;
  dayHigh?: number;
  dayLow?: number;
}

export interface PositionInfo {
  position: number;
  avgCost: number;
  unrealizedPnl: number;
  mktValue: number;
}

// The full response from our new endpoint
export interface StockDetailsResponse {
  staticInfo: StaticInfo;
  quote: QuoteInfo;
  positionInfo: PositionInfo | null;
}

export default function StockItem() {
  const { conid: conidFromUrl } = useParams<{ conid: string }>();
  const [view, setView] = useState<"chart" | "options">("chart");

  // Chart State
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("7D");

  // Options State
  //  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExpiration, setSelectedExpiration] = useState<string>("");
  const [optionsChainData, setOptionsChainData] =
    useState<OptionsChainData | null>(null);

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
  const setInitialPosition = useStockStore((state) => state.setInitialPosition);
  const selectedAccountId = useStockStore((state) => state.selectedAccountId);

  const { ticker } = activeStock;
  const conid = conidFromUrl ? parseInt(conidFromUrl, 10) : null;


  const { data: stockDetails, isLoading: isDetailsLoading } =
    useQuery<StockDetailsResponse>({
      queryKey: ["stockDetails", conid, selectedAccountId],
      queryFn: async () => {
        const response = await api.get(`/market/stock/${conid}/details`, {
          params: {
            accountId: selectedAccountId,
          },
        });
        return response.data;
      },
      enabled: !!conid && !!selectedAccountId,
    });
    const isDataStale = stockDetails?.staticInfo?.conid !== conid;


  useEffect(() => {
    if (stockDetails) {
      // Data has arrived, populate the store
      startTransition(() => {
        setPreloadedDetails(stockDetails.staticInfo);
        setInitialQuote({
          ...stockDetails.quote, // Spread the quote data (price, bid, ask...)
          conid: stockDetails.staticInfo.conid, // Add the conid from staticInfo
        });
        setInitialPosition(stockDetails.positionInfo);
      });

      // Subscribe to live updates
      subscribeToStock(conid!);
    }

    // Unsubscribe when the component unmounts or conid changes
    return () => {
      if (conid) {
        unsubscribeFromStock(conid);
      }
    };
  }, [stockDetails, conid]);

  const {
    data: expirations,
    isLoading: isExpirationsLoading,
    error: expirationsError,
  } = useQuery({
    queryKey: ["expirations", ticker],
    queryFn: async () => {
      const response = await api.get<string[]>(
        `market/options/expirations/${ticker}`
      );
      return response.data;
    },
    enabled: view === "options" && !!ticker,
    // The 'onSuccess' callback has been removed.
  });

  // NEW: Use useEffect to handle the side effect of setting the default expiration.
  // This runs whenever the 'expirations' data from the query changes.
  useEffect(() => {
    // If we have expiration dates but none is selected yet, select the first one.
    if (expirations && expirations.length > 0 && !selectedExpiration) {
      setSelectedExpiration(expirations[0]);
    }
  }, [expirations, selectedExpiration]);

  // --- Query 2: Fetch Filtered Option Chain ---
  const {
    data: chainResponse,
    isLoading: isChainLoading,
    error: chainError,
  } = useQuery({
    queryKey: ["optionChain", ticker, selectedExpiration],
    queryFn: async () => {
      const response = await api.get<FilteredChainResponse>(
        `market/options/chain/${ticker}?expiration_month=${selectedExpiration}`
      );
      return response.data;
    },
    // Only run this query when we have a selected expiration
    enabled: !!selectedExpiration,
  });

  useEffect(() => {
    if (chainResponse) {
      setOptionsChainData(chainResponse.chain);
    }
  }, [chainResponse]);

  const handleChainUpdate = (updatedChain: OptionsChainData) => {
    setOptionsChainData(updatedChain);
  };

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

  if (isDataStale) {
    return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
            <CircularProgress />
        </Box>
    );
}

  return (
    <Box
      className="layoutContainer"
      sx={{
        p: 2,
        // Define the master grid layout for the whole page
        display: "grid",
        // Two rows: header (auto height), main content (fills remaining space)
        gridTemplateRows: "auto 1fr",
        // Two columns: main (2fr), sidebar (1fr)
        gridTemplateColumns: "2fr 1fr",
        gap: "0 20px", // 0px row gap, 20px column gap
        // Set a height boundary for the entire component
        height: "calc(100vh - 80px)", // Adjust 80px to match your navbar height
      }}
    >
      <Typography
        variant="h5"
        component="h2"
        gutterBottom
        sx={{ gridColumn: "1 / -1" }}
      >
        {activeStock.companyName} ({activeStock.ticker})
      </Typography>

      <div
        className="chart-and-info"
        style={{
          gridRow: 2, // Place in the second row
          gridColumn: 1, // Place in the first column
          display: "flex",
          flexDirection: "column",
          minHeight: 0, // Prevents flex items from overflowing
        }}
      >
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
                  variant={selectedPeriod === period ? "contained" : "outlined"}
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period}
                </Button>
              ))}
            </ButtonGroup>
          )}
        </Stack>

        {/* This loader is now controlled by the chart-specific loading state */}
        {view === "chart" && !isChartLoading && <CandleStickChart />}
        {isChartLoading && (
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
        )}

        {view === "options" && (
          <OptionsChain
            allStrikes={chainResponse?.all_strikes || []}
            ticker={ticker || ""}
            onChainUpdate={handleChainUpdate}
            chainData={optionsChainData}
            expirations={expirations || []}
            selectedExpiration={selectedExpiration}
            onExpirationChange={(e) => setSelectedExpiration(e.target.value)}
            // Combine loading states from both queries
            isLoading={isExpirationsLoading || isChainLoading}
            // Combine error states
            error={expirationsError?.message || chainError?.message || null}
            currentPrice={activeStock.quote.lastPrice || 0}
          />
        )}
      </div>
      <div
        className="trading-panel"
        style={{
          gridRow: 2, // Place in the second row
          gridColumn: 2, // Place in the second column
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflowY: "auto",
          gap: "10px",
        }}
      >
        <PositionDetails />
        <DepthOfBookTable depth={activeStock.depth} />
        <OrderPanel conid={activeStock.conid} />
      </div>
    </Box>
  );
}
