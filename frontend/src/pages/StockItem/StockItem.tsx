import { fetchExpirations, fetchHistoricalStockDataBars, fetchOptionChain, fetchStockDetails, StockDetailsResponse } from "@/api/stock";
import CandleStickChart from "@/components/charts/CandleSticksChart";
import { useAccountPermissions } from "@/hooks/useAccountPermissions";
import { useStockStore } from "@/stores/stockStore";
import { OptionContract, OptionsChainData } from "@/types/options";
import {
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import DepthOfBookTable from "./DepthOfBookTable";
import LiveQuoteDisplay from "./LiveQuoteDisplay";
import OptionsChain from "./options/OptionsChain";
import { PositionDetails } from "./PositionDetails";
import OrderPanel from "./trading/OrderPanel";

const timePeriods = ["1D", "7D", "1M", "3M", "YTD", "1Y", "5Y"];


interface TradingTarget {
  conid: number;
  name: string;      // A clean name for display, e.g., "Stock: AAPL" or "Option: AAPL..."
  type: 'STOCK' | 'OPTION';
}

export default function StockItem() {
  const { conid: conidFromUrl } = useParams<{ conid: string }>();
  const [view, setView] = useState<"chart" | "options">("chart");
  const [tradingTarget, setTradingTarget] = useState<TradingTarget | null>(null);

  // Chart State
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("7D");

  // Options State

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
  const setPositions = useStockStore((state) => state.setPositions);
  const selectedAccountId = useStockStore((state) => state.selectedAccountId);

  const { ticker } = activeStock;
  const conid = conidFromUrl ? parseInt(conidFromUrl, 10) : null;

  const { data: permissions, isLoading: isPermissionsLoading } =
    useAccountPermissions();
  

  const { data: stockDetails, isLoading: isDetailsLoading } =
    useQuery<StockDetailsResponse>({
      queryKey: ["stockDetails", conid, selectedAccountId],
      queryFn: () => fetchStockDetails(conid!, selectedAccountId!),
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
        setPositions({
          stock: stockDetails.positionInfo,
          options: stockDetails.optionPositions,
        });
      });
      if (stockDetails.staticInfo) {
        setTradingTarget({
          conid: stockDetails.staticInfo.conid,
          name: `Stock: ${stockDetails.staticInfo.ticker}`,
          type: 'STOCK',
        });
      }

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
    queryFn: () => fetchExpirations(ticker!),
    enabled: view === "options" && !!ticker,
  });


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
    queryFn: () => fetchOptionChain(ticker!, selectedExpiration!),
    enabled: !!ticker && !!selectedExpiration,
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
  const {
    data: chartData,
    isLoading: isLoadingChart,
    isSuccess, 
    isError,   
    error,    
  } = useQuery({
    queryKey: ["historicalStockData", conid, selectedPeriod],
    queryFn: () => fetchHistoricalStockDataBars(conid!, selectedPeriod),
    staleTime: 1000 * 60 * 5,
    enabled: !!conid,
    // No onSuccess or onError callbacks here
  });
  
  // This is the correct pattern for performing side effects in v5
  useEffect(() => {
    if (isSuccess) {
      // When the query succeeds, update your store with the fetched data
      startTransition(() => {
        setInitialChartData(chartData);
      });
    } else if (isError) {
      // When the query fails, log the error and clear the store
      console.error("Failed to fetch chart history:", error);
      startTransition(() => {
        setInitialChartData([]);
      });
    }
  }, [isSuccess, isError, chartData, error, setInitialChartData]);

  const { isTradingDisabled, disabledReason } = useMemo(() => {
    // Default to disabled until all data is loaded
    if (!permissions || !tradingTarget) {
      return { 
        isTradingDisabled: true, 
        disabledReason: "Loading account permissions..." 
      };
    }
    
    // Check based on the CURRENT trading target
    if (tradingTarget.type === 'STOCK') {
      if (!permissions.canTrade) {
        return { 
          isTradingDisabled: true, 
          disabledReason: "Stock trading is not permitted on this account." 
        };
      }
    }
    
    if (tradingTarget.type === 'OPTION') {
      if (!permissions.allowOptionsTrading) {
        return { 
          isTradingDisabled: true, 
          disabledReason: "Options trading is not permitted on this account." 
        };
      }
    }
    
    // If all checks pass, trading is enabled
    return { isTradingDisabled: false, disabledReason: "" };

  }, [permissions, tradingTarget]);

  const handleOptionSelect = (option: OptionContract, optionType: 'call' | 'put') => {
    // A simple formatter for the option name
    const optionName = `${ticker} ${selectedExpiration} ${option.strike} ${optionType.toUpperCase()}`;
    
    setTradingTarget({
      conid: option.contractId,
      name: `Option: ${optionName}`,
      type: 'OPTION',
    });
    
    toast.info(`Trading target set to: ${optionName}`);
  };

  const handleRevertToStock = () => {
    if (stockDetails?.staticInfo) {
      setTradingTarget({
        conid: stockDetails.staticInfo.conid,
        name: `Stock: ${stockDetails.staticInfo.ticker}`,
        type: 'STOCK',
      });
      toast.info("Trading target reset to stock.");
    }
  };

  if (isDataStale) {
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
            isLoading={isExpirationsLoading || isChainLoading}
            error={expirationsError?.message || chainError?.message || null}
            currentPrice={activeStock.quote.lastPrice || 0}
            onOptionSelect={handleOptionSelect}
            isTradingEnabled={permissions?.allowOptionsTrading ?? false}
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
        <OrderPanel
          tradingTarget={tradingTarget}
          onRevertToStock={handleRevertToStock}
          disabled={isTradingDisabled}
          disabledReason={disabledReason}
        />
      </div>
    </Box>
  );
}
