/* -----------------------------------------------------------
   New watchlist page – chooses a watch-list first, then shows
   the comparison chart, simulation table and portfolio snapshot
   ----------------------------------------------------------- */

import api from "@/api/axios";
import ComparisonChart from "@/components/ComparisonChart";
import ComparisonControls from "@/components/ComparisonControls";
import PortfolioSummary from "@/components/PortfolioSummary";
import WatchlistTable from "@/components/WatchlistTable";
import { useStockStore } from "@/stores/stockStore";
import {
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

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

/* -------------------- Period → IBKR bar -------------------- */

const PERIOD_BAR: Record<string, [string, string]> = {
  "1D": ["1d", "2min"],
  "7D": ["1w", "15min"],
  "1M": ["1m", "1h"],
  "3M": ["3m", "3h"],
  "6M": ["6m", "1d"],
  "1Y": ["1y", "1d"],
};

/* =====================  MAIN PAGE  ========================= */

const WatchlistPage: React.FC = () => {
  // const theme = useTheme();
  const { watchlists, setWatchlists } = useStockStore();

  /* ------- page-level state ------- */
  const [selectedId, setSelectedId] = useState<string | "">("");
  const [benchmark, setBenchmark] = useState("SPY");
  const [timeRange, setTimeRange] = useState<
    "1D" | "7D" | "1M" | "3M" | "6M" | "1Y"
  >("1M");
  const [localQuantities, setLocalQuantities] = useState<
    Record<string, number>
  >({});

  /* user edits */
  const handleQuantityChange = (tkr: string, v: string) => {
    const q = parseInt(v, 10);
    setLocalQuantities((prev) => ({ ...prev, [tkr]: isNaN(q) ? 0 : q }));
  };

  /* =============================================
   * 1️⃣  fetch list of user watch-lists once
   * ============================================= */
  const { isLoading: listLoading } = useQuery({
    queryKey: ["watchlists"],
    queryFn: async () => {
      const { data } = await api.get("/watchlists");
      /* data comes back as { "123":"Tech Growth", "456":"Dividend"} */
      setWatchlists(data);
      /* select the first list automatically (optional) */
      if (!selectedId) setSelectedId(Object.keys(data)[0] ?? "");
      return data;
    },
  });

  /* ==================================================
   * 2️⃣  fetch ONE watch-list (contracts & tickers)
   * ================================================== */
  const { data: watchlistDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["watchlist", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await api.get("/watchlists/detail", {
        params: { id: selectedId },
      });
      /* instruments → ['AAPL','MSFT', …] */
      return data;
    },
  });

  const tickers: string[] = useMemo(
    () => watchlistDetail?.instruments?.map((i: any) => i.ticker) ?? [],
    [watchlistDetail]
  );

  const secTypes = useMemo(() => {
    const map: Record<string, string> = {};
    watchlistDetail?.instruments?.forEach((i) => {
      if (i.assetClass) map[i.ticker] = i.assetClass; // e.g. 'FUT', 'STK'
    });
    return map;
  }, [watchlistDetail]);

  /* =========================================================
   * 3️⃣  fetch historical prices for the tickers + benchmark
   * ========================================================= */
  const { data: stocksData, isLoading: priceLoading } = useQuery<StockData[]>({
    queryKey: ["prices", tickers, benchmark, timeRange],
    enabled: tickers.length > 0 || !!benchmark,
    queryFn: async () => {
      const body = {
        tickers: Array.from(new Set([...tickers, benchmark])),
        timeRange,
        sec_types: secTypes,
        // metrics: ["price"],
      };
      const { data } = await api.post("/watchlists/historical", body);
      return data;
    },
  });

  /* reset quantities whenever the watch-list changes */
  useEffect(() => {
    const init: Record<string, number> = {};
    tickers.forEach((t) => (init[t] = localQuantities[t] ?? 0));
    setLocalQuantities(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers.join(",")]);

  /* ------------ derived helpers (same logic as before) --------------- */
  const calcPct = (s: number, e: number) => (s ? ((e - s) / s) * 100 : 0);

  const chartData = useMemo(() => {
    if (!stocksData?.length) return [];
    const reference = stocksData[0].historical.map((p) => p.date);
    return reference.map((date) => {
      const pt: any = { date };
      stocksData.forEach((stk) => {
        const first = stk.historical[0]?.price ?? 0;
        const cur = stk.historical.find((p) => p.date === date)?.price ?? null;
        pt[stk.ticker] = cur === null ? null : calcPct(first, cur);
      });
      return pt;
    });
  }, [stocksData]);

  /* ----------- dummy portfolio simulation (same as old) -------------- */

    // Helper to calculate % change
    const calculatePercentChange = (startValue: number, endValue: number): number => {
      if (!startValue || startValue === 0) return 0;
      return ((endValue - startValue) / startValue) * 100;
    };

  const processPortfolioPerformanceChartData = useCallback(
    (
      data: StockData[] | undefined,
      portfolio: PortfolioItem[],
      benchmarkTicker: string
    ) => {
      if (!data || data.length === 0 || portfolio.length === 0) return [];

      const benchmarkData = data.find((stock) => stock.ticker === benchmarkTicker);
      const portfolioStockData = data.filter((stock) =>
        portfolio.some((p) => p.ticker === stock.ticker)
      );

      if (!benchmarkData || portfolioStockData.length === 0) return [];

      const referenceSeries = benchmarkData.historical || portfolioStockData[0]?.historical || [];
      if (referenceSeries.length < 2) return [];
      const dates = referenceSeries.map((point) => point.date);

      const priceMap: Record<string, Record<string, number>> = {};
      data.forEach((stock) => {
        if (!stock.historical) return;
        priceMap[stock.ticker] = {};
        stock.historical.forEach((point) => {
          priceMap[stock.ticker][point.date] = point.price;
        });
      });

      let initialPortfolioValue = 0;
      const initialBenchmarkPrice = priceMap[benchmarkTicker]?.[dates[0]];

      portfolio.forEach((item) => {
        const initialPrice = priceMap[item.ticker]?.[dates[0]];
        if (initialPrice !== undefined && item.quantity > 0) {
          initialPortfolioValue += initialPrice * item.quantity;
        }
      });

      if (initialPortfolioValue === 0 || initialBenchmarkPrice === undefined) {
        console.warn('Could not calculate initial values for portfolio chart.');
        return [];
      }

      return dates.map((date) => {
        let currentPortfolioValue = 0;
        portfolio.forEach((item) => {
          const currentPrice = priceMap[item.ticker]?.[date];
          if (currentPrice !== undefined && item.quantity > 0) {
            currentPortfolioValue += currentPrice * item.quantity;
          }
        });

        const currentBenchmarkPrice = priceMap[benchmarkTicker]?.[date];

        const portfolioPercentChange = calculatePercentChange(
          initialPortfolioValue,
          currentPortfolioValue
        );
        const benchmarkPercentChange =
          currentBenchmarkPrice !== undefined
            ? calculatePercentChange(initialBenchmarkPrice, currentBenchmarkPrice)
            : null;

        return {
          date,
          portfolio: portfolioPercentChange,
          benchmark: benchmarkPercentChange,
        };
      });
    },
    [calculatePercentChange]
  );
  
  const watchlistPortfolio: PortfolioItem[] = useMemo(
    () =>
      Object.entries(localQuantities) // {AAPL: 10, MSFT: 0, ...}
        .filter(([_, qty]) => qty > 0) // keep only positions &gt; 0
        .map(([ticker, qty]) => ({ ticker, quantity: qty })),
    [localQuantities]
  );

  const portfolioPerf: PortfolioPerf = useMemo(() => {
    if (!stocksData)
      return { totalValue: 0, totalChange: 0, totalPercentChange: 0 };
    let iv = 0,
      cv = 0;
    watchlistPortfolio.forEach((p) => {
      const sd = stocksData.find((s) => s.ticker === p.ticker);
      if (!sd) return;
      const first = sd.historical[0].price;
      const last = sd.historical.at(-1)!.price;
      iv += first * p.quantity;
      cv += last * p.quantity;
    });
    const ch = cv - iv;
    const pct = iv ? (ch / iv) * 100 : 0;
    return { totalValue: cv, totalChange: ch, totalPercentChange: pct };
  }, [stocksData, watchlistPortfolio]);

  const portfolioChartData = useMemo(() => {
    if (!stocksData || watchlistPortfolio.length === 0) return [];
    return processPortfolioPerformanceChartData(
      stocksData,
      watchlistPortfolio,
      benchmark,
    );
  }, [stocksData, watchlistPortfolio, benchmark]);
  /* ------------------------- render ------------------------- */
  if (listLoading) {
    return (
      <CenteredBox>
        <CircularProgress />
      </CenteredBox>
    );
  }

  return (
    <Box
      sx={{
        height: "calc(90vh - 90px)",
        overflow: "auto",
        paddingX: 15,
        paddingY: 5,
      }}
    >
      {/*  ======  choose watch-list  ====== */}
      <FormControl sx={{ minWidth: 240, mb: 2 }}>
        <InputLabel id="wl-label">Select watch-list</InputLabel>
        <Select
          labelId="wl-label"
          value={selectedId}
          label="Select watch-list"
          onChange={(e) => setSelectedId(e.target.value as string)}
        >
          {Object.entries(watchlists).map(([id, name]) => (
            <MenuItem key={id} value={id}>
              {name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {detailLoading || priceLoading ? (
        <CenteredBox>
          <CircularProgress />
        </CenteredBox>
      ) : (
        <>
          <ComparisonControls
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            comparisonMetric="percent_change"
            /* keep benchmark selection */
            benchmark={benchmark}
            setBenchmark={setBenchmark}
          />

          <ComparisonChart
            chartData={chartData}
            watchlist={tickers}
            benchmark={benchmark}
            comparisonMetric="percent_change"
            stocksData={stocksData}
            stocksLoading={priceLoading}
          />

          {/* ----- simulation table – no delete / add buttons ------ */}
          <WatchlistTable
            watchlist={tickers}
            stocksData={stocksData}
            timeRange={timeRange}
            localQuantities={localQuantities}
            handleQuantityChange={handleQuantityChange}
            /* remove all props related to “add / delete” */
          />

          <PortfolioSummary
            portfolioPerformance={portfolioPerf}
            portfolioChartData={portfolioChartData}
            timeRange={timeRange}
            benchmark={benchmark}
            watchlistPortfolio={watchlistPortfolio}
          />
        </>
      )}
    </Box>
  );
};

export default WatchlistPage;

/* ------------- tiny utility to centre loaders -------------- */
const CenteredBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      height: "70vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    {children}
  </Box>
);
