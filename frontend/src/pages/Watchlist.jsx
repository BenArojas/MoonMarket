import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/api/axios';
import { useUser } from '@/contexts/UserContext';
import { TrashIcon, PlusIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/solid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

// --- Debounce Hook (Optional but recommended for cleaner code) ---
// You could place this in a separate utility file
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes (also on delay change or unmount)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
// --- End Debounce Hook ---

const Watchlist = () => {
  const userData = useUser();
  const watchlist = userData?.watchlist || [];
  const watchlistPortfolio = userData?.watchlist_portfolio || [];
  const queryClient = useQueryClient();
  const theme = useTheme();

  // Local state
  const [timeRange, setTimeRange] = useState('1M'); // 1D, 5D, 1M, 6M, 1Y, 5Y
  // *** MODIFIED: Default to 'percent_change', limited options ***
  const [comparisonMetric, setComparisonMetric] = useState('percent_change'); // price, percent_change
  const [benchmark, setBenchmark] = useState('SPY'); // SPY, QQQ, DIA, IWM
  const [chartData, setChartData] = useState([]);
  const [portfolioChartData, setPortfolioChartData] = useState([]); // *** NEW: State for portfolio chart ***
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [newStockTicker, setNewStockTicker] = useState('');
  // *** NEW: State to manage local quantity input changes before debouncing ***
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
    // *** Ensure queryKey includes all dependencies ***
    queryKey: ['watchlistStocks', watchlist, benchmark, timeRange],
    queryFn: async () => {
      if (watchlist.length === 0 && !benchmark) return []; // Need benchmark even if watchlist is empty for portfolio comparison
      const tickersToFetch = Array.from(new Set([...watchlist, benchmark]));
      if (tickersToFetch.length === 0) return [];

      const response = await api.post('/watchlist/historical', {
        tickers: tickersToFetch,
        timeRange,
        // *** Always fetch 'price' for calculations, even if comparing % change ***
        metrics: ['price']
      });
      return response.data;
    },
    // *** Fetch if benchmark exists, even with empty watchlist (for portfolio chart) ***
    enabled: !!benchmark || watchlist.length > 0,
  });

  // Mutations
  const toggleWatchlistMutation = useMutation({
    mutationFn: (ticker) => api.post('/watchlist/toggle', { ticker }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authStatus'] }); // Use object syntax
      queryClient.invalidateQueries({ queryKey: ['watchlistStocks'] }); // Refetch stock data too
      setNewStockTicker('');
      setShowAddStockModal(false);
    },
  });

  const removeFromWatchlistMutation = useMutation({
    mutationFn: (ticker) => api.post('/watchlist/remove', { ticker }),
    onSuccess: (data, ticker) => { // Access ticker variable if needed
      queryClient.invalidateQueries({ queryKey: ['authStatus'] });
      queryClient.invalidateQueries({ queryKey: ['watchlistStocks'] });
      // *** Remove from local quantities state as well ***
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
      // Don't necessarily need to invalidate watchlistStocks here unless portfolio change affects it
    },
  });

  // --- Debounce portfolio updates ---
  const debouncedPortfolioUpdate = useCallback(
    (updatedPortfolio) => {
      updatePortfolioMutation.mutate(updatedPortfolio);
    },
    [updatePortfolioMutation] // updatePortfolioMutation should be stable
  );

  const debounceDelay = 500; // milliseconds

  // Effect to trigger debounced mutation when localQuantities change
  useEffect(() => {
    // Convert localQuantities back into the portfolio structure expected by the API
    const updatedPortfolioForAPI = Object.entries(localQuantities)
      .map(([ticker, quantity]) => ({ ticker, quantity: parseInt(quantity) || 0 }))
      .filter(item => item.quantity > 0 || watchlistPortfolio.some(p => p.ticker === item.ticker)); // Keep items even if qty is 0 if they existed before

    // Add back any portfolio items not currently in localQuantities (e.g., if removed from watchlist but still in portfolio state temporarily)
    watchlistPortfolio.forEach(item => {
      if (!updatedPortfolioForAPI.some(p => p.ticker === item.ticker)) {
        // Only add if it's still in the main watchlist, otherwise it should be removed
        if (watchlist.includes(item.ticker)) {
          updatedPortfolioForAPI.push({ ticker: item.ticker, quantity: 0 });
        }
      }
    });


    const handler = setTimeout(() => {
      // Compare with original portfolio to see if there's an actual change
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


  // Helper to calculate % change between two values
  const calculatePercentChange = (startValue, endValue) => {
    if (!startValue || startValue === 0) return 0;
    return ((endValue - startValue) / startValue) * 100;
  };

  const generateColor = (index) => {
    const hue = (index * 137) % 360; // Use a prime number like 137
    return `hsl(${hue}, 70%, 60%)`; // Adjusted lightness slightly too
  };

  // Process chart data for the TOP comparison chart
  const processComparisonChartData = useCallback((data, metric, benchmarkTicker) => {
    if (!data || data.length === 0 || !data[0]?.historical || data[0].historical.length === 0) return [];

    const benchmarkData = data.find(stock => stock.ticker === benchmarkTicker);
    const watchlistStockData = data.filter(stock => stock.ticker !== benchmarkTicker && watchlist.includes(stock.ticker));

    if (!benchmarkData && watchlistStockData.length === 0) return [];

    // Use dates from the first available series (either benchmark or first watchlist stock)
    const referenceSeries = benchmarkData?.historical || watchlistStockData[0]?.historical || [];
    if (referenceSeries.length === 0) return [];
    const dates = referenceSeries.map(point => point.date);

    // Create a map of dates to values for each ticker's relevant metric
    const tickerDataMap = {};
    data.forEach(stock => {
      if (!stock.historical || stock.historical.length === 0) return;
      tickerDataMap[stock.ticker] = {};
      const firstPrice = stock.historical[0]?.price; // Needed for percent_change calc

      stock.historical.forEach(point => {
        if (metric === 'percent_change') {
          tickerDataMap[stock.ticker][point.date] = calculatePercentChange(firstPrice, point.price);
        } else { // metric === 'price'
          tickerDataMap[stock.ticker][point.date] = point[metric]; // Assumes 'price' exists
        }
      });
    });

    // Create the chart data array
    return dates.map(date => {
      const point = { date };
      data.forEach(stock => {
        // Only include tickers that are in the current watchlist or are the benchmark
        if (watchlist.includes(stock.ticker) || stock.ticker === benchmarkTicker) {
          const value = tickerDataMap[stock.ticker]?.[date];
          // Use null for missing data points so the line breaks in the chart
          point[stock.ticker] = value !== undefined ? value : null;
        }
      });
      return point;
    });
  }, [watchlist]); // Add watchlist as dependency


  // Process data for the NEW portfolio performance chart
  const processPortfolioPerformanceChartData = useCallback((data, portfolio, benchmarkTicker) => {
    if (!data || data.length === 0 || portfolio.length === 0) return [];

    const benchmarkData = data.find(stock => stock.ticker === benchmarkTicker);
    const portfolioStockData = data.filter(stock => portfolio.some(p => p.ticker === stock.ticker));

    if (!benchmarkData || portfolioStockData.length === 0) return []; // Need both for comparison

    // Use dates from benchmark (or first portfolio stock if benchmark missing data)
    const referenceSeries = benchmarkData.historical || portfolioStockData[0]?.historical || [];
    if (referenceSeries.length < 2) return []; // Need at least 2 points for change calc
    const dates = referenceSeries.map(point => point.date);

    // Create a map for faster lookups: { ticker: { date: price } }
    const priceMap = {};
    data.forEach(stock => {
      if (!stock.historical) return;
      priceMap[stock.ticker] = {};
      stock.historical.forEach(point => {
        priceMap[stock.ticker][point.date] = point.price;
      });
    });

    // Calculate initial values
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
      return []; // Cannot calculate percentage change without initial value
    }


    // Calculate performance for each date
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
        : null; // Use null if benchmark data is missing for this date

      return {
        date,
        portfolio: portfolioPercentChange,
        benchmark: benchmarkPercentChange,
      };
    });

  }, []); // No external dependencies needed here if data structures are consistent


  // Update Comparison Chart Data
  useEffect(() => {
    if (stocksData && stocksData.length > 0) {
      const formattedData = processComparisonChartData(stocksData, comparisonMetric, benchmark);
      setChartData(formattedData);
    } else {
      setChartData([]); // Clear chart if no data
    }
  }, [stocksData, comparisonMetric, benchmark, processComparisonChartData]); // Use the memoized function

  // *** NEW: Update Portfolio Performance Chart Data ***
  useEffect(() => {
    if (stocksData && stocksData.length > 0 && watchlistPortfolio.length > 0) {
      const portfolioData = processPortfolioPerformanceChartData(stocksData, watchlistPortfolio, benchmark);
      setPortfolioChartData(portfolioData);
    } else {
      setPortfolioChartData([]); // Clear chart if no data or no portfolio items
    }
  }, [stocksData, watchlistPortfolio, benchmark, processPortfolioPerformanceChartData]); // Use the memoized function

  // Calculate performance metrics for the table (remains largely the same)
  const calculatePerformance = (ticker) => {
    if (!stocksData) return { change: 0, percentChange: 0, currentPrice: 0 };

    const stockData = stocksData.find(stock => stock.ticker === ticker);
    if (!stockData || !stockData.historical || stockData.historical.length < 1) {
      return { change: 0, percentChange: 0, currentPrice: 0 };
    }

    const historical = stockData.historical;
    const firstPrice = historical[0].price;
    const lastPrice = historical[historical.length - 1].price;

    // Handle cases with only one data point
    if (historical.length < 2) {
      return { change: 0, percentChange: 0, currentPrice: lastPrice || 0 }
    }

    const change = lastPrice - firstPrice;
    const percentChange = calculatePercentChange(firstPrice, lastPrice);

    return { change, percentChange, currentPrice: lastPrice };
  };

  // Handle portfolio simulation updates (*** MODIFIED for debounce ***)
  const handleQuantityChange = (ticker, quantityStr) => {
    const quantity = parseInt(quantityStr);

    // Update local state immediately for responsive UI
    setLocalQuantities(prev => ({
      ...prev,
      [ticker]: isNaN(quantity) ? '' : quantity // Store as number or empty string
    }));

    // The actual API call is handled by the debounced useEffect
  };


  // Handle adding a new stock to watchlist
  const handleAddToWatchlist = () => {
    if (newStockTicker && !watchlist.includes(newStockTicker)) { // Prevent adding duplicates
      toggleWatchlistMutation.mutate(newStockTicker);
    } else if (watchlist.includes(newStockTicker)) {
      // Optional: Add some user feedback that it's already added
      console.log(`${newStockTicker} is already in the watchlist.`);
      setShowAddStockModal(false); // Still close modal
    }
  };

  // Calculate total portfolio performance (current snapshot)
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
          // If only one point, initial and current are the same for this stock
          initialValue += lastPrice * item.quantity;
          currentValue += lastPrice * item.quantity;
        }
      }
    });

    const totalChange = currentValue - initialValue;
    const totalPercentChange = initialValue > 0 ? (totalChange / initialValue) * 100 : 0;

    return { totalValue: currentValue, totalChange, totalPercentChange };
  };

  // Memoize performance calculation to avoid re-running on every render
  const portfolioPerformance = useMemo(calculatePortfolioPerformance, [stocksData, watchlistPortfolio]);


  // Render loading state
  if (stocksLoading && !stocksData) { // Show loading only on initial load
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '85vh', color: 'text.primary' }}>Loading watchlist data...</Box>;
  }

  return (
    <Box
      sx={{
        height: 'calc(100vh - 90px)', // Adjust 64px based on your header height
        overflowY: 'auto',
        bgcolor: 'background.default',
        color: 'text.primary',
        p: 2,
        // Improve scrollbar styling across browsers
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: theme.palette.background.paper, // Or a lighter/darker shade
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: theme.palette.mode === 'dark' ? 'grey.700' : 'grey.400',
          borderRadius: '4px',
        },
        scrollbarWidth: 'thin', // Firefox
        scrollbarColor: `${theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[400]} ${theme.palette.background.paper}`, // Firefox
      }}
    >
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold" style={{ color: theme.palette.text.primary }}>Watchlist</h1>
          <button
            onClick={() => setShowAddStockModal(true)}
            style={{
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText // Use contrast text for better theme compatibility
            }}
            className="px-4 py-2 rounded flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" /> Add Stock
          </button>
        </div>

        {/* Comparison Controls */}
        <div
          className="p-4 rounded shadow mb-6"
          style={{ backgroundColor: theme.palette.background.paper }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.palette.text.secondary }}>Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="block w-full p-2 rounded border bg-transparent" // Simplified classes
                style={{
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.paper, // Ensure background for consistency
                }}
              >
                {/* Consider making options dynamic if needed */}
                <option value="1D">1 Day</option>
                <option value="5D">5 Days</option>
                <option value="1M">1 Month</option>
                <option value="6M">6 Months</option>
                <option value="1Y">1 Year</option>
                <option value="5Y">5 Years</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.palette.text.secondary }}>Comparison Metric</label>
              <select
                value={comparisonMetric}
                onChange={(e) => setComparisonMetric(e.target.value)}
                className="block w-full p-2 rounded border bg-transparent"
                style={{
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                {/* *** MODIFIED OPTIONS *** */}
                <option value="percent_change">Percent Change</option>
                <option value="price">Share Price</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.palette.text.secondary }}>Benchmark</label>
              <select
                value={benchmark}
                onChange={(e) => setBenchmark(e.target.value)}
                className="block w-full p-2 rounded border bg-transparent"
                style={{
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                <option value="SPY">S&P 500 (SPY)</option>
                <option value="QQQ">Nasdaq 100 (QQQ)</option>
                <option value="DIA">Dow Jones (DIA)</option>
                <option value="IWM">Russell 2000 (IWM)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Comparison Chart */}
        {(watchlist.length > 0 || benchmark) && chartData.length > 0 ? ( // Show if watchlist or benchmark exists and has data
          <div
            className="p-4 rounded shadow mb-6"
            style={{ backgroundColor: theme.palette.background.paper }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: theme.palette.text.primary }}>
              {watchlist.length > 0 ? 'Watchlist' : 'Benchmark'} vs Benchmark Comparison ({comparisonMetric === 'price' ? 'Price' : '% Change'})
            </h2>
            <div className="h-80"> {/* Consider making height responsive */}
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                    stroke={theme.palette.divider}
                  // Consider formatting dates based on timeRange
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                    stroke={theme.palette.divider}
                    // Add formatter for percentage if needed
                    tickFormatter={(value) => comparisonMetric === 'percent_change' ? `${value?.toFixed(0)}%` : value?.toFixed(0)}
                    domain={['auto', 'auto']} // Allow auto-scaling
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      color: theme.palette.text.primary,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: '4px',
                      fontSize: '0.8rem', // Smaller tooltip text
                    }}
                    itemStyle={{ color: theme.palette.text.primary }}
                    labelStyle={{ color: theme.palette.text.secondary, marginBottom: '5px' }}
                    formatter={(value, name) => [`${comparisonMetric === 'percent_change' ? value?.toFixed(2) + '%' : '$' + value?.toFixed(2)}`, name]}
                  />
                  <Legend wrapperStyle={{ color: theme.palette.text.primary, fontSize: '0.8rem', paddingTop: '10px' }} />
                  {watchlist.map((ticker, index) => (
                    <Line
                      key={ticker}
                      type="monotone"
                      dataKey={ticker}
                      stroke={generateColor(index)} // Adjust color logic if needed
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false} // Don't connect gaps in data
                    />
                  ))}
                  {/* Only render benchmark line if benchmark is selected and data exists */}
                  {benchmark && stocksData?.some(s => s.ticker === benchmark) && (
                    <Line
                      type="monotone"
                      dataKey={benchmark}
                      name={`${benchmark} (Benchmark)`} // Clearer legend name
                      stroke={theme.palette.text.secondary} // Use theme color
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          !stocksLoading && ( // Only show "no data" if not loading
            <div
              className="p-4 rounded shadow mb-6 text-center"
              style={{ backgroundColor: theme.palette.background.paper }}
            >
              <p style={{ color: theme.palette.text.secondary }}>
                {watchlist.length === 0 ? "Add stocks to your watchlist to see comparison." : "No historical data available for the selected range/metric."}
              </p>
            </div>
          )
        )}

        {/* Watchlist Table */}
        <div
          className="p-4 rounded shadow mb-6"
          style={{ backgroundColor: theme.palette.background.paper }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: theme.palette.text.primary }}>Your Watchlist & Simulation</h2>

          {watchlist.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y" style={{ borderColor: theme.palette.divider }}>
                <thead style={{ backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : 'rgba(0,0,0,0.04)' }}>
                  <tr>
                    {/* Adjusted column headers */}
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.palette.text.secondary }}>Ticker</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.palette.text.secondary }}>Last Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.palette.text.secondary }}>Change ({timeRange})</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.palette.text.secondary }}>Sim Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.palette.text.secondary }}>Sim Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.palette.text.secondary }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: theme.palette.divider }}>
                  {watchlist.map((ticker) => {
                    const { change, percentChange, currentPrice } = calculatePerformance(ticker);
                    const quantity = localQuantities[ticker] !== undefined ? localQuantities[ticker] : (watchlistPortfolio.find(item => item.ticker === ticker)?.quantity || 0);
                    const value = currentPrice * (parseInt(quantity) || 0);

                    // *** NEW: Check if this specific ticker's delete is pending ***
                    const isDeleting = removeFromWatchlistMutation.isPending && removeFromWatchlistMutation.variables === ticker;

                    return (
                      // *** MODIFIED: Removed hover classes, added opacity when deleting ***
                      <tr
                        key={ticker}
                        style={{ opacity: isDeleting ? 0.5 : 1, transition: 'opacity 0.3s ease-in-out' }} // Dim row when deleting
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium" style={{ color: theme.palette.text.primary }}>{ticker}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm" style={{ color: theme.palette.text.primary }}>
                          ${currentPrice > 0 ? currentPrice.toFixed(2) : 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm" style={{ color: percentChange >= 0 ? theme.palette.success.main : theme.palette.error.main }}>
                          {currentPrice > 0 && stocksData?.find(s => s.ticker === ticker)?.historical?.length > 1
                            ? `${percentChange.toFixed(2)}% (${change >= 0 ? '+' : ''}${change.toFixed(2)})`
                            : `N/A`
                          }
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <input
                            type="number"
                            min="0"
                            value={quantity}
                            onChange={(e) => handleQuantityChange(ticker, e.target.value)}
                            className="w-20 p-1 rounded border"
                            style={{
                              backgroundColor: theme.palette.background.paper,
                              color: theme.palette.text.primary,
                              borderColor: theme.palette.divider,
                              textAlign: 'right'
                            }}
                            placeholder="0"
                            // *** Disable input while deleting the row ***
                            disabled={isDeleting}
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm " style={{ color: theme.palette.text.primary }}>
                          ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}

                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {/* *** MODIFIED: Disable button and change icon when deleting *** */}
                          <button
                            onClick={() => removeFromWatchlistMutation.mutate(ticker)}
                            style={{
                              color: theme.palette.error.light,
                              cursor: isDeleting ? 'not-allowed' : 'pointer' // Change cursor when disabled
                            }}
                            className="hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed" // Use utility classes for disabled state
                            title={isDeleting ? `Removing ${ticker}...` : `Remove ${ticker}`}
                            disabled={isDeleting} // Disable button based on isDeleting flag
                          >
                            {isDeleting ? (
                              // Optional: Show a small loading indicator instead of the icon
                              <svg className="animate-spin h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <TrashIcon className="h-5 w-5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-4" style={{ color: theme.palette.text.secondary }}>No stocks in your watchlist yet. Click "Add Stock".</p>
          )}
        </div>

        {/* Portfolio Simulation Summary */}
        {watchlistPortfolio.length > 0 && (
          <div
            className="p-4 rounded shadow mb-6"
            style={{ backgroundColor: theme.palette.background.paper }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: theme.palette.text.primary }}>Simulated Portfolio Snapshot ({timeRange})</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              {/* --- Total Value --- */}
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                <p style={{ color: theme.palette.text.secondary }} className="text-sm mb-1">Total Value</p>
                <p className="text-2xl font-bold" style={{ color: theme.palette.text.primary }}>
                  {/* *** FORMATTED VALUE *** */}
                  ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(portfolioPerformance.totalValue)}
                </p>
              </Box>
              {/* --- Total Change --- */}
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                <p style={{ color: theme.palette.text.secondary }} className="text-sm mb-1">Total Change</p>
                <p className="text-2xl font-bold" style={{ color: portfolioPerformance.totalChange >= 0 ? theme.palette.success.main : theme.palette.error.main }}>
                  {portfolioPerformance.totalChange >= 0 ? '+' : '-'}${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(portfolioPerformance.totalChange))}
                </p>
              </Box>
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                <p style={{ color: theme.palette.text.secondary }} className="text-sm mb-1">Total Return</p>
                <p className="text-2xl font-bold" style={{ color: portfolioPerformance.totalPercentChange >= 0 ? theme.palette.success.main : theme.palette.error.main }}>
                  {portfolioPerformance.totalPercentChange.toFixed(2)}%
                </p>
              </Box>
            </div>

            {/* *** NEW: Portfolio Performance Chart *** */}
            {portfolioChartData.length > 0 && (
              <div className="mt-6"> {/* Add margin top */}
                <h3 className="text-md font-semibold mb-4" style={{ color: theme.palette.text.primary }}>
                  Simulated Portfolio Return vs {benchmark} ({timeRange})
                </h3>
                <div className="h-60"> {/* Slightly smaller height? */}
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={portfolioChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                        stroke={theme.palette.divider}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                        stroke={theme.palette.divider}
                        tickFormatter={(value) => `${value?.toFixed(0)}%`} // Format as percentage
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          color: theme.palette.text.primary,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                        }}
                        itemStyle={{ color: theme.palette.text.primary }}
                        labelStyle={{ color: theme.palette.text.secondary, marginBottom: '5px' }}
                        // *** UPDATED FORMATTER ***
                        formatter={(value, name) => {
                          // 'name' here will be exactly "Your Portfolio" or "SPY (Benchmark)" etc.
                          const label = name; // Use the name directly passed by the Line component
                          const formattedValue = `${value?.toFixed(2)}%`;
                          return [formattedValue, label];
                        }}
                      />
                      <Legend wrapperStyle={{ color: theme.palette.text.primary, fontSize: '0.8rem', paddingTop: '10px' }} />
                      <Line
                        key="portfolio"
                        type="monotone"
                        dataKey="portfolio"
                        name="Your Portfolio"
                        stroke={theme.palette.primary.main} // Use primary theme color for portfolio
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                      />
                      <Line
                        key="benchmark"
                        type="monotone"
                        dataKey="benchmark"
                        name={`${benchmark} (Benchmark)`}
                        stroke={theme.palette.text.secondary}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {/* *** End NEW Chart *** */}

          </div>
        )}

        {/* Add Stock Modal */}
        {showAddStockModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}> {/* Darker overlay */}
            <div className="p-6 rounded shadow-lg w-full max-w-sm" style={{ backgroundColor: theme.palette.background.paper }}> {/* Constrain width */}
              <h3 className="text-lg font-semibold mb-4" style={{ color: theme.palette.text.primary }}>Add Stock to Watchlist</h3>
              <div className="mb-4">
                <label htmlFor="tickerInput" className="block text-sm font-medium mb-1" style={{ color: theme.palette.text.secondary }}>Ticker Symbol</label>
                <input
                  id="tickerInput"
                  type="text"
                  value={newStockTicker}
                  onChange={(e) => setNewStockTicker(e.target.value.toUpperCase().trim())} // Trim whitespace
                  className="block w-full p-2 rounded border" // Added border class
                  style={{
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    borderColor: theme.palette.divider
                  }}
                  placeholder="e.g., AAPL, MSFT"
                  autoFocus // Focus on input when modal opens
                />
              </div>
              <div className="flex justify-end space-x-3"> {/* Increased space */}
                <button
                  onClick={() => setShowAddStockModal(false)}
                  className="px-4 py-2 rounded"
                  style={{
                    border: `1px solid ${theme.palette.divider}`,
                    color: theme.palette.text.primary,
                    backgroundColor: 'transparent' // Explicitly transparent
                  }}
                  // Add hover effect based on theme
                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToWatchlist}
                  className="px-4 py-2 rounded"
                  style={{
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    opacity: !newStockTicker || toggleWatchlistMutation.isPending ? 0.6 : 1 // Dim if disabled or loading
                  }}
                  disabled={!newStockTicker || toggleWatchlistMutation.isPending} // Disable button
                >
                  {toggleWatchlistMutation.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Box>
  );
};

export default Watchlist;