// src/pages/Watchlist/ComparisonChart.tsx

import { formatDate } from '@/utils/dataProcessing';
import { useTheme } from '@mui/material/styles';
import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ComparisonChartProps {
  chartData: { [key: string]: number | null }[]; // Allow null for gaps
  benchmark: string;
}

const ComparisonChart = ({ chartData, benchmark }: ComparisonChartProps) => {
  const theme = useTheme();
  
  // Helper to get all ticker keys from the data, excluding the 'date' key.
  const dataKeys = useMemo(() => {
    if (chartData.length === 0) return [];
    return Object.keys(chartData[0]).filter(key => key !== 'date' && key !== benchmark);
  }, [chartData, benchmark]);

  const generateColor = (index: number) => {
    const hue = (index * 137) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  if (dataKeys.length === 0 && !benchmark) {
    return (
      <div className="p-4 rounded shadow mb-6 text-center" style={{ backgroundColor: theme.palette.background.paper }}>
        <p style={{ color: theme.palette.text.secondary }}>
          Select tickers from the dropdown to see a comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded shadow mb-6" style={{ backgroundColor: theme.palette.background.paper }}>
      <h2 className="text-lg font-semibold mb-4" style={{ color: theme.palette.text.primary }}>
        Performance Comparison
      </h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} stroke={theme.palette.divider} tickFormatter={formatDate} />
            <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} stroke={theme.palette.divider} tickFormatter={(value) => `${Number(value).toFixed(0)}%`} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}
              formatter={(value: number, name) => [`${value.toFixed(2)}%`, name]}
              labelFormatter={formatDate}
            />
            <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
            
            {/* Render lines based on keys found in the data */}
            {dataKeys.map((ticker, index) => (
              <Line key={ticker} type="monotone" dataKey={ticker} name={ticker} stroke={generateColor(index)} strokeWidth={2} dot={false} connectNulls={true} />
            ))}

            {/* Render benchmark line if it exists in the data */}
            {benchmark && chartData[0]?.[benchmark] !== undefined && (
              <Line type="monotone" dataKey={benchmark} name={`${benchmark} (Benchmark)`} stroke={theme.palette.text.secondary} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={true} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ComparisonChart;