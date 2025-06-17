import { useTheme } from '@mui/material/styles';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {  StockData } from '@/pages/Watchlist';


interface ComparisonChartProps {
  chartData: { [key: string]: number }[];
  watchlist: string[];
  benchmark: string;
  comparisonMetric: string;
  stocksData: StockData[] | undefined;
  stocksLoading: boolean;
}

const ComparisonChart = ({ 
  chartData, 
  watchlist, 
  benchmark, 
  comparisonMetric, 
  stocksData, 
  stocksLoading 
}: ComparisonChartProps) => {
  const theme = useTheme();
  
  const generateColor = (index: number) => {
    const hue = (index * 137) % 360; // Use a prime number like 137
    return `hsl(${hue}, 70%, 60%)`; // Adjusted lightness slightly too
  };

  const formatDate = (unixSeconds: number) =>
    new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });


  if (stocksLoading && !stocksData) {
    return null; // Or return a loading state specific to this component
  }

  if ((watchlist.length === 0 && !benchmark) || chartData.length === 0) {
    return (
      <div
        className="p-4 rounded shadow mb-6 text-center"
        style={{ backgroundColor: theme.palette.background.paper }}
      >
        <p style={{ color: theme.palette.text.secondary }}>
          {watchlist.length === 0 ? "Add stocks to your watchlist to see comparison." : "No historical data available for the selected range/metric."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-4 rounded shadow mb-6"
      style={{ backgroundColor: theme.palette.background.paper }}
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: theme.palette.text.primary }}>
        {watchlist.length > 0 ? 'Watchlist' : 'Benchmark'} vs Benchmark Comparison ({comparisonMetric === 'price' ? 'Price' : '% Change'})
      </h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
              stroke={theme.palette.divider}
              tickFormatter={formatDate}
            />
            <YAxis
              tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
              stroke={theme.palette.divider}
              tickFormatter={(value) => comparisonMetric === 'percent_change' ? `${value?.toFixed(0)}%` : value?.toFixed(0)}
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
              formatter={(value, name) => [`${comparisonMetric === 'percent_change' ? (value as number).toFixed(2) + '%' : '$' + (value as number).toFixed(2)}`, name]}
              labelFormatter={formatDate}
            />
            <Legend wrapperStyle={{ color: theme.palette.text.primary, fontSize: '0.8rem', paddingTop: '10px' }} />
            {watchlist.map((ticker, index) => (
              <Line
                key={ticker}
                type="monotone"
                dataKey={ticker}
                stroke={generateColor(index)}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            ))}
            {benchmark && stocksData?.some(s => s.ticker === benchmark) && (
              <Line
                type="monotone"
                dataKey={benchmark}
                name={`${benchmark} (Benchmark)`}
                stroke={theme.palette.text.secondary}
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
  );
};

export default ComparisonChart;