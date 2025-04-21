import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * StockComparisonChart - A reusable component for comparing stocks with different metrics
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of stock data objects with historical points
 * @param {string} props.metric - Metric to compare (price, pe_ratio, volume, market_cap, percent_change)
 * @param {string} props.benchmark - Ticker symbol of benchmark to highlight
 * @param {Array} props.tickers - Array of ticker symbols to include
 * @param {boolean} props.normalize - Whether to normalize values to percentage change from first point
 */
const StockComparisonChart = ({ 
  data = [], 
  metric = 'price', 
  benchmark = '',
  tickers = [],
  normalize = false
}) => {
  const [chartData, setChartData] = useState([]);
  
  // Process the data for chart display
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    // Get all unique dates from all stocks' historical data
    const allDates = new Set();
    data.forEach(stock => {
      if (stock.historical) {
        stock.historical.forEach(point => {
          allDates.add(point.date);
        });
      }
    });
    
    // Sort dates chronologically
    const sortedDates = Array.from(allDates).sort();
    
    // Create a map of ticker to its historical data indexed by date
    const tickerData = {};
    data.forEach(stock => {
      if (!stock.historical) return;
      
      tickerData[stock.ticker] = {};
      
      // Calculate base values for normalization if needed
      let baseValue = null;
      if (normalize && stock.historical.length > 0) {
        baseValue = stock.historical[0][metric];
      }
      
      stock.historical.forEach(point => {
        let value = point[metric];
        
        // Normalize to percentage change if requested
        if (normalize && baseValue && baseValue !== 0) {
          value = ((value - baseValue) / baseValue) * 100;
        }
        
        tickerData[stock.ticker][point.date] = value;
      });
    });
    
    // Build the chart data points
    const formattedData = sortedDates.map(date => {
      const point = { date };
      
      // Only include specified tickers or all if none specified
      const tickersToInclude = tickers.length > 0 ? tickers : Object.keys(tickerData);
      
      tickersToInclude.forEach(ticker => {
        if (tickerData[ticker] && tickerData[ticker][date] !== undefined) {
          point[ticker] = tickerData[ticker][date];
        }
      });
      
      return point;
    });
    
    setChartData(formattedData);
  }, [data, metric, normalize, tickers]);
  
  // Format tooltip values based on metric
  const formatTooltipValue = (value, name, props) => {
    if (metric === 'price') return `$${value.toFixed(2)}`;
    if (metric === 'percent_change' || normalize) return `${value.toFixed(2)}%`;
    if (metric === 'pe_ratio') return value.toFixed(2);
    if (metric === 'volume') return value.toLocaleString();
    if (metric === 'market_cap') return `$${(value / 1e9).toFixed(2)}B`;
    return value;
  };
  
  // Get Y-axis label based on metric
  const getYAxisLabel = () => {
    if (metric === 'price') return 'Price ($)';
    if (metric === 'percent_change' || normalize) return 'Change (%)';
    if (metric === 'pe_ratio') return 'P/E Ratio';
    if (metric === 'volume') return 'Volume';
    if (metric === 'market_cap') return 'Market Cap ($B)';
    return metric;
  };
  
  // Format Y-axis tick values
  const formatYAxis = (value) => {
    if (metric === 'price') return `$${value}`;
    if (metric === 'percent_change' || normalize) return `${value}%`;
    if (metric === 'market_cap') return `$${value / 1e9}B`;
    if (metric === 'volume') return value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value;
    return value;
  };
  
  // Return loading message if no data
  if (chartData.length === 0) {
    return <div className="p-4 text-center">No data available for chart</div>;
  }
  
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            tickFormatter={formatYAxis}
            label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft' }}
          />
          <Tooltip formatter={formatTooltipValue} />
          <Legend />
          
          {/* Draw lines for each ticker */}
          {tickers.length > 0 ? tickers.map((ticker, index) => (
            <Line
              key={ticker}
              type="monotone"
              dataKey={ticker}
              stroke={ticker === benchmark ? '#888888' : `hsl(${(index * 137) % 360}, 70%, 50%)`}
              strokeWidth={ticker === benchmark ? 1 : 2}
              strokeDasharray={ticker === benchmark ? '5 5' : null}
              dot={false}
              connectNulls={true}
            />
          )) : (
            Object.keys(tickerData || {}).map((ticker, index) => (
              <Line
                key={ticker}
                type="monotone"
                dataKey={ticker}
                stroke={ticker === benchmark ? '#888888' : `hsl(${(index * 137) % 360}, 70%, 50%)`}
                strokeWidth={ticker === benchmark ? 1 : 2}
                strokeDasharray={ticker === benchmark ? '5 5' : null}
                dot={false}
                connectNulls={true}
              />
            ))
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockComparisonChart;