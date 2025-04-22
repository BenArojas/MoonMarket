import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/api/axios';
import { useUser } from '@/contexts/UserContext';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import ComparisonControls from '@/components/ComparisonControls';
import ComparisonChart from '@/components/ComparisonChart';
import WatchlistTable from '@/components/WatchlistTable';
import PortfolioSummary from '@/components/PortfolioSummary';
import AddStockModal from '@/components/AddStockModalToWatchlist';

const Watchlist = () => {
  const userData = useUser();
  const watchlist = userData?.watchlist || [];
  const watchlistPortfolio = userData?.watchlist_portfolio || [];
  const queryClient = useQueryClient();
  const theme = useTheme();

  // Local state
  const [timeRange, setTimeRange] = useState('1M'); // 1D, 5D, 1M, 6M, 1Y, 5Y
  const [comparisonMetric, setComparisonMetric] = useState('percent_change'); // price, percent_change
  const [benchmark, setBenchmark] = useState('SPY'); // SPY, QQQ, DIA, IWM
  const [chartData, setChartData] = useState([]);
  const [portfolioChartData, setPortfolioChartData] = useState([]);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [newStockTicker, setNewStockTicker] = useState('');
  const [localQuantities, setLocalQuantities] = useState({});

  // Initialize localQuantities when watchlistPortfolio changes
  useEffect(() => {
    const initialQuantities = watchlistPortfolio.reduce((acc, item) => {
      acc[item.ticker] = item.quantity;
      return acc;
    }, {});
    setLocalQuantities(initialQuantities);
  }, [watchlistPortfolio]);

  // Fetch watchlist stock data
  const { data: stocksData, isLoading: stocksLoading } = useQuery({
    queryKey: ['watchlistStocks', watchlist, benchmark, timeRange],
    queryFn: async () => {
      if (watchlist.length === 0 && !benchmark) return [];
      const tickersToFetch = Array.from(new Set([...watchlist, benchmark]));
      if (tickersToFetch.length === 0) return [];

      const response = await api.post('/watchlist/historical', {
        tickers: tickersToFetch,
        timeRange,
        metrics: ['price']
      });
      return response.data;
    },
    enabled: !!benchmark || watchlist.length > 0,
  });

  // Mutations
  const toggleWatchlistMutation = useMutation({
    mutationFn: (ticker) => api.post('/watchlist/toggle', { ticker }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authStatus'] });
      queryClient.invalidateQueries({ queryKey: ['watchlistStocks'] });
      setNewStockTicker('');
      setShowAddStockModal(false);
    },
  });

  const removeFromWatchlistMutation = useMutation({
    mutationFn: (ticker) => api.post('/watchlist/remove', { ticker }),
    onSuccess: (data, ticker) => {
      queryClient.invalidateQueries({ queryKey: ['authStatus'] });
      queryClient.invalidateQueries({ queryKey: ['watchlistStocks'] });
      setLocalQuantities(prev => {
        const newState = { ...prev };
        delete newState[ticker];
        return newState;
      });
    },
  });

  const updatePortfolioMutation = useMutation({
    mutationFn: (data) => api.post('/watchlist/portfolio', { watchlist_portfolio: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authStatus'] });
    },
  });

  // --- Debounce portfolio updates ---
  const debouncedPortfolioUpdate = useCallback(
    (updatedPortfolio) => {
      updatePortfolioMutation.mutate(updatedPortfolio);
    },
    [updatePortfolioMutation]
  );

  const debounceDelay = 500;

  // Effect to trigger debounced mutation when localQuantities change
  useEffect(() => {
    const updatedPortfolioForAPI = Object.entries(localQuantities)
      .map(([ticker, quantity]) => ({ ticker, quantity: parseInt(quantity) || 0 }))
      .filter(item => item.quantity > 0 || watchlistPortfolio.some(p => p.ticker === item.ticker));

    watchlistPortfolio.forEach(item => {
      if (!updatedPortfolioForAPI.some(p => p.ticker === item.ticker)) {
        if (watchlist.includes(item.ticker)) {
          updatedPortfolioForAPI.push({ ticker: item.ticker, quantity: 0 });
        }
      }
    });

    const handler = setTimeout(() => {
      const hasChanged = JSON.stringify(updatedPortfolioForAPI.sort((a, b) => a.ticker.localeCompare(b.ticker))) !== JSON.stringify(watchlistPortfolio.sort((a, b) => a.ticker.localeCompare(b.ticker)));

      if (hasChanged) {
        debouncedPortfolioUpdate(updatedPortfolioForAPI);
      }
    }, debounceDelay);

    return () => {
      clearTimeout(handler);
    };
  }, [localQuantities, debouncedPortfolioUpdate, debounceDelay, watchlistPortfolio, watchlist]);
  // --- End Debounce ---

  // Helper to calculate % change
  const calculatePercentChange = (startValue, endValue) => {
    if (!startValue || startValue === 0) return 0;
    return ((endValue - startValue) / startValue) * 100;
  };


  // Process chart data for ComparisonChart
  const processComparisonChartData = useCallback((data, metric, benchmarkTicker) => {
    if (!data || data.length === 0 || !data[0]?.historical || data[0].historical.length === 0) return [];

    const benchmarkData = data.find(stock => stock.ticker === benchmarkTicker);
    const watchlistStockData = data.filter(stock => stock.ticker !== benchmarkTicker && watchlist.includes(stock.ticker));

    if (!benchmarkData && watchlistStockData.length === 0) return [];

    const referenceSeries = benchmarkData?.historical || watchlistStockData[0]?.historical || [];
    if (referenceSeries.length === 0) return [];
    const dates = referenceSeries.map(point => point.date);

    const tickerDataMap = {};
    data.forEach(stock => {
      if (!stock.historical || stock.historical.length === 0) return;
      tickerDataMap[stock.ticker] = {};
      const firstPrice = stock.historical[0]?.price;

      stock.historical.forEach(point => {
        if (metric === 'percent_change') {
          tickerDataMap[stock.ticker][point.date] = calculatePercentChange(firstPrice, point.price);
        } else {
          tickerDataMap[stock.ticker][point.date] = point[metric];
        }
      });
    });

    return dates.map(date => {
      const point = { date };
      data.forEach(stock => {
        if (watchlist.includes(stock.ticker) || stock.ticker === benchmarkTicker) {
          const value = tickerDataMap[stock.ticker]?.[date];
          point[stock.ticker] = value !== undefined ? value : null;
        }
      });
      return point;
    });
  }, [watchlist]);

  // Process data for PortfolioSummary chart
  const processPortfolioPerformanceChartData = useCallback((data, portfolio, benchmarkTicker) => {
    if (!data || data.length === 0 || portfolio.length === 0) return [];

    const benchmarkData = data.find(stock => stock.ticker === benchmarkTicker);
    const portfolioStockData = data.filter(stock => portfolio.some(p => p.ticker === stock.ticker));

    if (!benchmarkData || portfolioStockData.length === 0) return [];

    const referenceSeries = benchmarkData.historical || portfolioStockData[0]?.historical || [];
    if (referenceSeries.length < 2) return [];
    const dates = referenceSeries.map(point => point.date);

    const priceMap = {};
    data.forEach(stock => {
      if (!stock.historical) return;
      priceMap[stock.ticker] = {};
      stock.historical.forEach(point => {
        priceMap[stock.ticker][point.date] = point.price;
      });
    });

    let initialPortfolioValue = 0;
    const initialBenchmarkPrice = priceMap[benchmarkTicker]?.[dates[0]];

    portfolio.forEach(item => {
      const initialPrice = priceMap[item.ticker]?.[dates[0]];
      if (initialPrice !== undefined && item.quantity > 0) {
        initialPortfolioValue += initialPrice * item.quantity;
      }
    });

    if (initialPortfolioValue === 0 || initialBenchmarkPrice === undefined) {
      console.warn("Could not calculate initial values for portfolio chart.");
      return [];
    }

    return dates.map(date => {
      let currentPortfolioValue = 0;
      portfolio.forEach(item => {
        const currentPrice = priceMap[item.ticker]?.[date];
        if (currentPrice !== undefined && item.quantity > 0) {
          currentPortfolioValue += currentPrice * item.quantity;
        }
      });

      const currentBenchmarkPrice = priceMap[benchmarkTicker]?.[date];

      const portfolioPercentChange = calculatePercentChange(initialPortfolioValue, currentPortfolioValue);
      const benchmarkPercentChange = currentBenchmarkPrice !== undefined
        ? calculatePercentChange(initialBenchmarkPrice, currentBenchmarkPrice)
        : null;

      return {
        date,
        portfolio: portfolioPercentChange,
        benchmark: benchmarkPercentChange,
      };
    });
  }, []);

  // Update Comparison Chart Data
  useEffect(() => {
    if (stocksData && stocksData.length > 0) {
      const formattedData = processComparisonChartData(stocksData, comparisonMetric, benchmark);
      setChartData(formattedData);
    } else {
      setChartData([]);
    }
  }, [stocksData, comparisonMetric, benchmark, processComparisonChartData]);

  // Update Portfolio Performance Chart Data
  useEffect(() => {
    if (stocksData && stocksData.length > 0 && watchlistPortfolio.length > 0) {
      const portfolioData = processPortfolioPerformanceChartData(stocksData, watchlistPortfolio, benchmark);
      setPortfolioChartData(portfolioData);
    } else {
      setPortfolioChartData([]);
    }
  }, [stocksData, watchlistPortfolio, benchmark, processPortfolioPerformanceChartData]);

  // Handle portfolio simulation updates
  const handleQuantityChange = (ticker, quantityStr) => {
    const quantity = parseInt(quantityStr);
    setLocalQuantities(prev => ({
      ...prev,
      [ticker]: isNaN(quantity) ? '' : quantity
    }));
  };

  // Handle adding a new stock to watchlist
  const handleAddToWatchlist = () => {
    if (newStockTicker && !watchlist.includes(newStockTicker)) {
      toggleWatchlistMutation.mutate(newStockTicker);
    } else if (watchlist.includes(newStockTicker)) {
      console.log(`${newStockTicker} is already in the watchlist.`);
      setShowAddStockModal(false);
    }
  };

  // Calculate total portfolio performance
  const calculatePortfolioPerformance = () => {
    if (!stocksData || watchlistPortfolio.length === 0) return { totalValue: 0, totalChange: 0, totalPercentChange: 0 };

    let initialValue = 0;
    let currentValue = 0;

    watchlistPortfolio.forEach(item => {
      const stockData = stocksData.find(stock => stock.ticker === item.ticker);
      if (stockData?.historical && stockData.historical.length > 0 && item.quantity > 0) {
        const firstPrice = stockData.historical[0].price;
        const lastPrice = stockData.historical[stockData.historical.length - 1].price;

        if (stockData.historical.length >= 1 && firstPrice !== undefined && lastPrice !== undefined) {
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
  const portfolioPerformance = useMemo(calculatePortfolioPerformance, [stocksData, watchlistPortfolio]);

  // Render loading state
  if (stocksLoading && !stocksData) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '85vh', color: 'text.primary' }}>Loading watchlist data...</Box>;
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
          <h1 className="text-2xl font-bold" style={{ color: theme.palette.text.primary }}>Watchlist</h1>
          <button
            onClick={() => setShowAddStockModal(true)}
            style={{
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText
            }}
            className="px-4 py-2 rounded flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" /> Add Stock
          </button>
        </div>

        {/* Comparison Controls */}
        <ComparisonControls
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          comparisonMetric={comparisonMetric}
          setComparisonMetric={setComparisonMetric}
          benchmark={benchmark}
          setBenchmark={setBenchmark}
        />

        {/* Comparison Chart */}
        <ComparisonChart
          chartData={chartData}
          watchlist={watchlist}
          benchmark={benchmark}
          comparisonMetric={comparisonMetric}
          stocksData={stocksData}
          stocksLoading={stocksLoading}
        />

        {/* Watchlist Table */}
        <div
          className="p-4 rounded shadow mb-6"
          style={{ backgroundColor: theme.palette.background.paper }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: theme.palette.text.primary }}>Your Watchlist & Simulation</h2>
          <WatchlistTable
            watchlist={watchlist}
            stocksData={stocksData}
            timeRange={timeRange}
            localQuantities={localQuantities}
            handleQuantityChange={handleQuantityChange}
            removeFromWatchlistMutation={removeFromWatchlistMutation}
          />
        </div>

        {/* Portfolio Summary */}
        <PortfolioSummary
          portfolioPerformance={portfolioPerformance}
          portfolioChartData={portfolioChartData}
          timeRange={timeRange}
          benchmark={benchmark}
          watchlistPortfolio={watchlistPortfolio}
        />

        {/* Add Stock Modal */}
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