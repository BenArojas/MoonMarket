// src/pages/Watchlist/Watchlist.tsx

import api from "@/api/axios";
import ComparisonChart from "@/pages/Watchlist/ComparisonChart";
import ComparisonControls from "@/pages/Watchlist/ComparisonControls";
import WatchlistTable from "@/pages/Watchlist/WatchlistTable";
import { useDebounce } from "@/hooks/useDebounce";
import { useStockStore } from "@/stores/stockStore";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import PortfolioSummary from "./StimulatedPortfolioSummary";

/* --------------------- Helper types ------------------------ */

interface HistoricalPoint {
  date: string;
  price: number;
}
export interface StockData {
  ticker: string;
  name: string;
  historical: HistoricalPoint[];
}
interface PortfolioItem {
  ticker: string;
  quantity: number;
}
interface PortfolioPerf {
  totalValue: number;
  totalChange: number;
  totalPercentChange: number;
}

/* =====================  MAIN PAGE  ========================= */

const WatchlistPage: React.FC = () => {
  const { watchlists, setWatchlists } = useStockStore();

  /* ------- page-level state ------- */
  const [selectedId, setSelectedId] = useState<string>("");
  const [benchmark, setBenchmark] = useState("SPY");
  const [timeRange, setTimeRange] = useState<"1D" | "7D" | "1M" | "3M" | "6M" | "1Y">("1M");
  const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});
  const [comparisonTickers, setComparisonTickers] = useState<string[]>([]);
  const debouncedComparisonTickers = useDebounce(comparisonTickers, 500);

  const handleQuantityChange = (tkr: string, v: string) => {
    const q = parseInt(v, 10);
    setLocalQuantities((prev) => ({ ...prev, [tkr]: isNaN(q) ? 0 : q }));
  };

  /* --- 1. Fetch Watchlist IDs --- */
  const { data: fetchedWatchlists, isPending: listIsPending } = useQuery({
    queryKey: ["watchlists"],
    queryFn: async () => (await api.get("/watchlists")).data,
  });

  useEffect(() => {
    if (fetchedWatchlists) {
      setWatchlists(fetchedWatchlists);
      // Only set a new ID if one isn't already selected AND the new list has items.
      if (!selectedId && Object.keys(fetchedWatchlists).length > 0) {
        setSelectedId(Object.keys(fetchedWatchlists)[0]);
      }
    }
  }, [fetchedWatchlists, setWatchlists, selectedId]);

   /* --- 2. Fetch Watchlist Details --- */
  const { data: watchlistDetail, isPending: detailIsPending } = useQuery({
    queryKey: ["watchlist", selectedId],
    enabled: !!selectedId,
    queryFn: async () => (await api.get("/watchlists/detail", { params: { id: selectedId } })).data,
  });

  // Ideal list of tickers from the selected watchlist
  const idealTickers = useMemo(
    () => watchlistDetail?.instruments?.map((i: any) => i.ticker) ?? [],
    [watchlistDetail]
  );
  
  const secTypes = useMemo(() => {
    const map: Record<string, string> = {};
    watchlistDetail?.instruments?.forEach((i: any) => {
      if (i.assetClass) map[i.ticker] = i.assetClass;
    });
    return map;
  }, [watchlistDetail]);

  /* --- 3. Fetch Historical Data --- */
  const {
    data: stocksData,
    isPending: pricesPending,
    isError: pricesHaveError,
    error: pricesError,
    fetchStatus,
  } = useQuery<StockData[]>({
    queryKey: ["prices", debouncedComparisonTickers, benchmark, timeRange],
    enabled: debouncedComparisonTickers.length > 0 || !!benchmark,
    queryFn: async () => {
      const body = {
        tickers: Array.from(new Set([...debouncedComparisonTickers, benchmark])),
        timeRange,
        sec_types: secTypes,
      };
      return (await api.post("/watchlists/historical", body)).data;
    },
  });

   /* --- 4. Data Reliability & Sync Logic --- */

   const availableTickers = useMemo(() => stocksData?.filter(stock => stock.historical?.length > 0).map(stock => stock.ticker) ?? [], [stocksData]);
   const reliableStocksData = useMemo(() => stocksData?.filter(stock => availableTickers.includes(stock.ticker)) ?? [], [stocksData, availableTickers]);
   const failedTickers = useMemo(() => pricesPending || fetchStatus !== 'idle' ? [] : debouncedComparisonTickers.filter(t => !availableTickers.includes(t)), [debouncedComparisonTickers, availableTickers, pricesPending, fetchStatus]);
   useEffect(() => { if (availableTickers.length > 0) setComparisonTickers(prev => prev.filter(ticker => availableTickers.includes(ticker))); }, [availableTickers]);
   useEffect(() => { const init: Record<string, number> = {}; idealTickers.forEach((t) => (init[t] = 0)); setLocalQuantities(init); }, [idealTickers.join(",")]);


  //* --- 5. Derived State for Child Components --- */

  const comparisonChartData = useMemo(() => {
    if (!reliableStocksData.length) return [];
    
    // Use the benchmark's dates as the reference timeline
    const benchmarkData = reliableStocksData.find(s => s.ticker === benchmark);
    if (!benchmarkData) return [];

    const referenceDates = benchmarkData.historical.map(p => p.date);
    const priceMap = new Map(reliableStocksData.map(stock => [
        stock.ticker,
        new Map(stock.historical.map(p => [p.date, p.price]))
    ]));

    return referenceDates.map(date => {
      const point: { [key: string]: number | null } = { date: Number(date) };
      
      for (const stock of reliableStocksData) {
        const firstPrice = stock.historical[0]?.price;
        if (!firstPrice) {
          point[stock.ticker] = null;
          continue;
        }
        const currentPrice = priceMap.get(stock.ticker)?.get(date);
        point[stock.ticker] = currentPrice ? ((currentPrice - firstPrice) / firstPrice) * 100 : null;
      }
      return point;
    });
  }, [reliableStocksData, benchmark]);

  const watchlistPortfolio: PortfolioItem[] = useMemo(
    () => Object.entries(localQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([ticker, quantity]) => ({ ticker, quantity })),
    [localQuantities]
  );

  const portfolioPerf: PortfolioPerf = useMemo(() => {
    if (!reliableStocksData.length || !watchlistPortfolio.length) return { totalValue: 0, totalChange: 0, totalPercentChange: 0 };
    let initialValue = 0, currentValue = 0;
    
    watchlistPortfolio.forEach((p) => {
      const stockData = reliableStocksData.find((s) => s.ticker === p.ticker);
      if (stockData?.historical?.length) {
        initialValue += stockData.historical[0].price * p.quantity;
        currentValue += stockData.historical.at(-1)!.price * p.quantity;
      }
    });

    const totalChange = currentValue - initialValue;
    const totalPercentChange = initialValue ? (totalChange / initialValue) * 100 : 0;
    return { totalValue: currentValue, totalChange, totalPercentChange };
  }, [reliableStocksData, watchlistPortfolio]);

  const processPortfolioPerformanceChartData = useCallback(
    (data: StockData[], portfolio: PortfolioItem[], benchmarkTicker: string) => {
      // --- 1. Initial validation ---
      if (!data.length || !portfolio.length) return [];
      
      const benchmarkData = data.find(s => s.ticker === benchmarkTicker);
      if (!benchmarkData?.historical?.length) return []; // Cannot proceed without a benchmark timeline

      // --- 2. Create a fast lookup map for all prices ---
      const priceMap = new Map(data.map(stock => [
          stock.ticker,
          new Map(stock.historical.map(p => [p.date, p.price]))
      ]));

      const referenceDates = benchmarkData.historical.map(p => p.date);
      const firstDate = referenceDates[0];

      // --- 3. Determine the reliable portfolio and calculate a stable initial value ---
      // A portfolio item is "reliable" only if it has a valid price on the VERY FIRST day.
      const reliablePortfolio = portfolio.filter(item => priceMap.get(item.ticker)?.has(firstDate));
      if (reliablePortfolio.length === 0) return []; // No items to simulate

      const initialPortfolioValue = reliablePortfolio.reduce((total, item) => {
        const initialPrice = priceMap.get(item.ticker)!.get(firstDate)!;
        return total + (initialPrice * item.quantity);
      }, 0);

      const initialBenchmarkPrice = priceMap.get(benchmarkTicker)!.get(firstDate)!;

      if (initialPortfolioValue === 0) return []; // Avoid division by zero

      // --- 4. Map over the timeline to calculate daily performance ---
      return referenceDates.map(date => {
        let currentPortfolioValue = 0;
        let isPortfolioDataPointComplete = true;

        // Calculate portfolio value for the current date using ONLY reliable items
        for (const item of reliablePortfolio) {
          const currentPrice = priceMap.get(item.ticker)?.get(date);
          if (currentPrice === undefined) {
            isPortfolioDataPointComplete = false;
            break; // If one price is missing, we can't calculate the total for this day
          }
          currentPortfolioValue += currentPrice * item.quantity;
        }

        const currentBenchmarkPrice = priceMap.get(benchmarkTicker)?.get(date);

        // If data was missing, this point is null. The chart will connect across the gap.
        const portfolioPercentChange = isPortfolioDataPointComplete
          ? ((currentPortfolioValue - initialPortfolioValue) / initialPortfolioValue) * 100
          : null;

        const benchmarkPercentChange = currentBenchmarkPrice !== undefined
          ? ((currentBenchmarkPrice - initialBenchmarkPrice) / initialBenchmarkPrice) * 100
          : null;

        return {
          date: Number(date),
          portfolio: portfolioPercentChange,
          benchmark: benchmarkPercentChange,
        };
      });
    },
    [] // This function has no external dependencies
  );

  const portfolioChartData = useMemo(() => {
    return processPortfolioPerformanceChartData(reliableStocksData, watchlistPortfolio, benchmark);
  }, [reliableStocksData, watchlistPortfolio, benchmark, processPortfolioPerformanceChartData]);


  /* =========================================================
   * RENDER LOGIC
   * ========================================================= */

  if (listIsPending || detailIsPending) {
    return <CenteredBox><CircularProgress /></CenteredBox>;
  }

  return (
    <Box sx={{ height: "calc(90vh - 90px)", overflow: "auto", paddingX: 15, paddingY: 5 }}>
      {/* --- Watchlist and Ticker Selectors --- */}
      <FormControl sx={{ minWidth: 240, mb: 2 }}>
        <InputLabel id="wl-label">Select Watchlist</InputLabel>
        <Select labelId="wl-label" value={selectedId} label="Select Watchlist" onChange={(e) => setSelectedId(e.target.value as string)}>
          {Object.entries(watchlists).map(([id, name]) => (<MenuItem key={id} value={id}>{name}</MenuItem>))}
        </Select>
      </FormControl>

      <ComparisonControls timeRange={timeRange} setTimeRange={setTimeRange} benchmark={benchmark} setBenchmark={setBenchmark} comparisonMetric="percent_change" />

      <FormControl sx={{ minWidth: 240, my: 2 }}>
        <InputLabel id="tickers-select-label">Add Tickers to Chart</InputLabel>
        <Select labelId="tickers-select-label" multiple value={comparisonTickers} onChange={(e) => setComparisonTickers(e.target.value as string[])} label="Add Tickers to Chart">
          {idealTickers.map((ticker) => (<MenuItem key={ticker} value={ticker}>{ticker}</MenuItem>))}
        </Select>
      </FormControl>
      
      {/* --- NEW: Non-blocking alert for failed tickers --- */}
      {failedTickers.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
              Could not load data for the following tickers: {failedTickers.join(', ')}. They have been excluded from charts and calculations.
          </Alert>
      )}

      {/* --- Main Content Rendering --- */}
      {pricesPending && <CenteredBox><CircularProgress /></CenteredBox>}
      
      {pricesHaveError && <CenteredBox><Alert severity="error">Error fetching market data: {pricesError?.message}</Alert></CenteredBox>}

      {!pricesPending && !pricesHaveError && (
        <>
          <ComparisonChart
            chartData={comparisonChartData}
            benchmark={benchmark}
          />
          <WatchlistTable
            watchlist={idealTickers}
            stocksData={reliableStocksData}
            timeRange={timeRange}
            localQuantities={localQuantities}
            handleQuantityChange={handleQuantityChange}
          />
          <PortfolioSummary
            portfolioPerformance={portfolioPerf}
            portfolioChartData={portfolioChartData}
            timeRange={timeRange}
            benchmark={benchmark}
          />
        </>
      )}
    </Box>
  );
};

const CenteredBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ height: "70vh", display: "flex", justifyContent: "center", alignItems: "center" }}>{children}</Box>
);

export default WatchlistPage;