import React from 'react';
import { useTheme } from '@mui/material/styles';
import { TrashIcon } from '@heroicons/react/24/solid';

const WatchlistTable = ({ 
  watchlist, 
  stocksData, 
  timeRange, 
  localQuantities, 
  handleQuantityChange, 
  removeFromWatchlistMutation 
}) => {
  const theme = useTheme();

  const calculatePercentChange = (startValue, endValue) => {
    if (!startValue || startValue === 0) return 0;
    return ((endValue - startValue) / startValue) * 100;
  };

  // Calculate performance metrics for the table 
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

  if (watchlist.length === 0) {
    return (
      <p className="text-center py-4" style={{ color: theme.palette.text.secondary }}>No stocks in your watchlist yet. Click "Add Stock".</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y" style={{ borderColor: theme.palette.divider }}>
        <thead style={{ backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : 'rgba(0,0,0,0.04)' }}>
          <tr>
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
            const quantity = localQuantities[ticker] !== undefined ? localQuantities[ticker] : 0;
            const value = currentPrice * (parseInt(quantity) || 0);
            const isDeleting = removeFromWatchlistMutation.isPending && removeFromWatchlistMutation.variables === ticker;

            return (
              <tr
                key={ticker}
                style={{ opacity: isDeleting ? 0.5 : 1, transition: 'opacity 0.3s ease-in-out' }}
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
                    disabled={isDeleting}
                  />
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm " style={{ color: theme.palette.text.primary }}>
                  ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => removeFromWatchlistMutation.mutate(ticker)}
                    style={{
                      color: theme.palette.error.light,
                      cursor: isDeleting ? 'not-allowed' : 'pointer'
                    }}
                    className="hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isDeleting ? `Removing ${ticker}...` : `Remove ${ticker}`}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
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
  );
};

export default WatchlistTable;