import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/api/axios';
import { UserData, useUser } from '@/contexts/UserContext';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import ComparisonControls from '@/components/ComparisonControls';
import ComparisonChart from '@/components/ComparisonChart';
import WatchlistTable from '@/components/WatchlistTable';
import PortfolioSummary from '@/components/PortfolioSummary';
import AddStockModal from '@/components/AddStockModalToWatchlist';

// Interfaces for data structures
interface HistoricalData {
  date: string;
  price: number;
}

export interface StockData {
  ticker: string;
  name: string;
  historical: HistoricalData[];
}

export interface PortfolioItem {
  ticker: string;
  quantity: number;
}

export interface ChartDataPoint {
  date: string;
  [ticker: string]: number | null | string; // Ticker keys with values or null
}

export interface PortfolioChartDataPoint {
  date: string;
  portfolio: number;
  benchmark: number | null;
}

export interface PortfolioPerformance {
  totalValue: number;
  totalChange: number;
  totalPercentChange: number;
}

export interface ToggleWatchlistResponse {
  success: boolean;
  message?: string;
}

interface UpdatePortfolioResponse {
  success: boolean;
  message?: string;
}






const Watchlist: React.FC = () => {
  const userData = useUser() as UserData | null;
  const watchlist: string[] = userData?.watchlist || [];
  const watchlistPortfolio: PortfolioItem[] = userData?.watchlist_portfolio || [];
  const queryClient = useQueryClient();
  const theme = useTheme();

  // Local state
  const [timeRange, setTimeRange] = useState<string>('1M');
  const [comparisonMetric, setComparisonMetric] = useState<string>('percent_change');
  const [benchmark, setBenchmark] = useState<string>('SPY');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [portfolioChartData, setPortfolioChartData] = useState<PortfolioChartDataPoint[]>([]);
  const [showAddStockModal, setShowAddStockModal] = useState<boolean>(false);
  const [newStockTicker, setNewStockTicker] = useState<string>('');
  const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});

  // Initialize localQuantities
  useEffect(() => {
    const initialQuantities = watchlistPortfolio.reduce(
      (acc, item) => {
        acc[item.ticker] = item.quantity;
        return acc;
      },
      {} as Record<string, number>
    );
    setLocalQuantities(initialQuantities);
  }, [watchlistPortfolio]);

  // Fetch watchlist stock data
  const { data: stocksData, isLoading: stocksLoading } = useQuery<StockData[]>({
    queryKey: ['watchlistStocks', watchlist, benchmark, timeRange],
    queryFn: async () => {
      if (watchlist.length === 0 && !benchmark) return [];
      const tickersToFetch = Array.from(new Set([...watchlist, benchmark]));
      if (tickersToFetch.length === 0) return [];

      const response = await api.post('/watchlist/historical', {
        tickers: tickersToFetch,
        timeRange,
        metrics: ['price'],
      });

      return response.data as StockData[];
    },
    enabled: !!benchmark || watchlist.length > 0,
  });

  // Mutations
  const toggleWatchlistMutation = useMutation<
    ToggleWatchlistResponse,
    Error,
    string
  >({
    mutationFn: (ticker) => api.post('/watchlist/toggle', { ticker }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authStatus'] });
      queryClient.invalidateQueries({ queryKey: ['watchlistStocks'] });
      setNewStockTicker('');
      setShowAddStockModal(false);
    },
  });

  const updatePortfolioMutation = useMutation<
    UpdatePortfolioResponse,
    Error,
    PortfolioItem[]
  >({
    mutationFn: (data) => api.post('/watchlist/portfolio', { watchlist_portfolio: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authStatus'] });
    },
  });

  // Debounce portfolio updates
  const debouncedPortfolioUpdate = useCallback(
    (updatedPortfolio: PortfolioItem[]) => {
      updatePortfolioMutation.mutate(updatedPortfolio);
    },
    []
  );

  const debounceDelay = 500;

  // Effect for debounced portfolio updates
  useEffect(() => {
    const updatedPortfolioForAPI = Object.entries(localQuantities)
      .map(([ticker, quantity]) => ({
        ticker,
        quantity: parseInt(quantity as any) || 0,
      }))
      .filter(
        (item) =>
          item.quantity > 0 ||
          watchlistPortfolio.some((p) => p.ticker === item.ticker)
      );

    watchlistPortfolio.forEach((item) => {
      if (!updatedPortfolioForAPI.some((p) => p.ticker === item.ticker)) {
        if (watchlist.includes(item.ticker)) {
          updatedPortfolioForAPI.push({ ticker: item.ticker, quantity: 0 });
        }
      }
    });

    const handler = setTimeout(() => {
      const hasChanged =
        JSON.stringify(
          updatedPortfolioForAPI.sort((a, b) => a.ticker.localeCompare(b.ticker))
        ) !==
        JSON.stringify(
          watchlistPortfolio.sort((a, b) => a.ticker.localeCompare(b.ticker))
        );

      if (hasChanged) {
        debouncedPortfolioUpdate(updatedPortfolioForAPI);
      }
    }, debounceDelay);

    return () => {
      clearTimeout(handler);
    };
  }, [localQuantities, debouncedPortfolioUpdate, watchlistPortfolio, watchlist]);

  // Helper to calculate % change
  const calculatePercentChange = (startValue: number, endValue: number): number => {
    if (!startValue || startValue === 0) return 0;
    return ((endValue - startValue) / startValue) * 100;
  };

  // Process chart data for ComparisonChart
  const processComparisonChartData = useCallback(
    (
      data: StockData[] | undefined,
      metric: string,
      benchmarkTicker: string
    ): ChartDataPoint[] => {
      if (!data || data.length === 0 || !data[0]?.historical || data[0].historical.length === 0)
        return [];

      const benchmarkData = data.find((stock) => stock.ticker === benchmarkTicker);
      const watchlistStockData = data.filter(
        (stock) => stock.ticker !== benchmarkTicker && watchlist.includes(stock.ticker)
      );

      if (!benchmarkData && watchlistStockData.length === 0) return [];

      const referenceSeries = benchmarkData?.historical || watchlistStockData[0]?.historical || [];
      if (referenceSeries.length === 0) return [];
      const dates = referenceSeries.map((point) => point.date);

      const tickerDataMap: Record<string, Record<string, number>> = {};
      data.forEach((stock) => {
        if (!stock.historical || stock.historical.length === 0) return;
        tickerDataMap[stock.ticker] = {};
        const firstPrice = stock.historical[0]?.price;

        stock.historical.forEach((point) => {
          if (metric === 'percent_change') {
            tickerDataMap[stock.ticker][point.date] = calculatePercentChange(
              firstPrice,
              point.price
            );
          } else {
            tickerDataMap[stock.ticker][point.date] = point[metric as keyof HistoricalData] as number;
          }
        });
      });

      return dates.map((date) => {
        const point: ChartDataPoint = { date };
        data.forEach((stock) => {
          if (watchlist.includes(stock.ticker) || stock.ticker === benchmarkTicker) {
            const value = tickerDataMap[stock.ticker]?.[date];
            point[stock.ticker] = value !== undefined ? value : null;
          }
        });
        return point;
      });
    },
    [watchlist, calculatePercentChange]
  );

  // Process data for PortfolioSummary chart
  const processPortfolioPerformanceChartData = useCallback(
    (
      data: StockData[] | undefined,
      portfolio: PortfolioItem[],
      benchmarkTicker: string
    ): PortfolioChartDataPoint[] => {
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

  // Update Comparison Chart Data
  useEffect(() => {
    if (stocksData && stocksData.length > 0) {
      const formattedData = processComparisonChartData(stocksData, comparisonMetric, benchmark);
      setChartData(formattedData);
    } else {
      setChartData([]);
    }
  }, [stocksData, comparisonMetric, benchmark]);

  // Update Comparison Chart Data
  useEffect(() => {
    if (stocksData && stocksData.length > 0) {
      const formattedData = processComparisonChartData(stocksData, comparisonMetric, benchmark);
      // Only update if data has changed to avoid infinite loop
      setChartData((prev) =>
        JSON.stringify(prev) !== JSON.stringify(formattedData) ? formattedData : prev
      );
    } else {
      setChartData((prev) => (prev.length > 0 ? [] : prev));
    }
  }, [stocksData, comparisonMetric, benchmark, processComparisonChartData]);

  // Update Portfolio Performance Chart Data
  useEffect(() => {
    if (stocksData && stocksData.length > 0 && watchlistPortfolio.length > 0) {
      const portfolioData = processPortfolioPerformanceChartData(
        stocksData,
        watchlistPortfolio,
        benchmark
      );
      setPortfolioChartData((prev) =>
        JSON.stringify(prev) !== JSON.stringify(portfolioData) ? portfolioData : prev
      );
    } else {
      setPortfolioChartData((prev) => (prev.length > 0 ? [] : prev));
    }
  }, [stocksData, watchlistPortfolio, benchmark, processPortfolioPerformanceChartData]);

  // Handle portfolio simulation updates
  const handleQuantityChange = (ticker: string, quantityStr: string): void => {
    const quantity = parseInt(quantityStr);
    setLocalQuantities((prev) => {
      const newQuantities = {
        ...prev,
        [ticker]: isNaN(quantity) ? 0 : quantity,
      };
      if (prev[ticker] !== newQuantities[ticker]) {
        return newQuantities;
      }
      return prev;
    });
  };

  // Handle adding a new stock to watchlist
  const handleAddToWatchlist = (): void => {
    if (newStockTicker && !watchlist.includes(newStockTicker)) {
      toggleWatchlistMutation.mutate(newStockTicker);
    } else if (watchlist.includes(newStockTicker)) {
      console.log(`${newStockTicker} is already in the watchlist.`);
      setShowAddStockModal(false);
    }
  };

  // Calculate total portfolio performance
  const calculatePortfolioPerformance = (): PortfolioPerformance => {
    if (!stocksData || watchlistPortfolio.length === 0)
      return { totalValue: 0, totalChange: 0, totalPercentChange: 0 };

    let initialValue = 0;
    let currentValue = 0;

    watchlistPortfolio.forEach((item) => {
      const stockData = stocksData.find((stock) => stock.ticker === item.ticker);
      if (stockData?.historical && stockData.historical.length > 0 && item.quantity > 0) {
        const firstPrice = stockData.historical[0].price;
        const lastPrice = stockData.historical[stockData.historical.length - 1].price;

        if (
          stockData.historical.length >= 1 &&
          firstPrice !== undefined &&
          lastPrice !== undefined
        ) {
          initialValue += firstPrice * item.quantity;
          currentValue += lastPrice * item.quantity;
        } else if (stockData.historical.length === 1 && lastPrice !== undefined) {
          initialValue += lastPrice * item.quantity;
          currentValue += lastPrice * item.quantity;
        }
      }
    });

    const totalChange = currentValue - initialValue;
    const totalPercentChange = initialValue > 0 ? (totalChange / initialValue) * 100 : 0;

    return { totalValue: currentValue, totalChange, totalPercentChange };
  };

  // Memoize performance calculation
  const portfolioPerformance = useMemo(
    () => calculatePortfolioPerformance(),
    [stocksData, watchlistPortfolio]
  );

  // Render loading state
  if (stocksLoading && !stocksData) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '85vh',
          color: 'text.primary',
        }}
      >
        Loading watchlist data...
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: 'calc(100vh - 90px)',
        overflowY: 'auto',
        bgcolor: 'background.default',
        color: 'text.primary',
        p: 2,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: theme.palette.background.paper,
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: theme.palette.mode === 'dark' ? 'grey.700' : 'grey.400',
          borderRadius: '4px',
        },
        scrollbarWidth: 'thin',
        scrollbarColor: `${theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[400]} ${theme.palette.background.paper}`,
      }}
    >
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold" style={{ color: theme.palette.text.primary }}>
            Watchlist
          </h1>
          <button
            onClick={() => setShowAddStockModal(true)}
            style={{
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            }}
            className="px-4 py-2 rounded flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" /> Add Stock
          </button>
        </div>

        <ComparisonControls
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          comparisonMetric={comparisonMetric}
          setComparisonMetric={setComparisonMetric}
          benchmark={benchmark}
          setBenchmark={setBenchmark}
        />

        <ComparisonChart
          chartData={chartData}
          watchlist={watchlist}
          benchmark={benchmark}
          comparisonMetric={comparisonMetric}
          stocksData={stocksData}
          stocksLoading={stocksLoading}
        />

        <div
          className="p-4 rounded shadow mb-6"
          style={{ backgroundColor: theme.palette.background.paper }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: theme.palette.text.primary }}>
            Your Watchlist & Simulation
          </h2>
          <WatchlistTable
            watchlist={watchlist}
            stocksData={stocksData}
            timeRange={timeRange}
            localQuantities={localQuantities}
            handleQuantityChange={handleQuantityChange}
            setLocalQuantities={setLocalQuantities}
          />
        </div>

        <PortfolioSummary
          portfolioPerformance={portfolioPerformance}
          portfolioChartData={portfolioChartData}
          timeRange={timeRange}
          benchmark={benchmark}
          watchlistPortfolio={watchlistPortfolio}
        />

        <AddStockModal
          showAddStockModal={showAddStockModal}
          setShowAddStockModal={setShowAddStockModal}
          newStockTicker={newStockTicker}
          setNewStockTicker={setNewStockTicker}
          handleAddToWatchlist={handleAddToWatchlist}
          toggleWatchlistMutation={toggleWatchlistMutation}
        />
      </div>
    </Box>
  );
};

export default Watchlist;