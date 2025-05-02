import React from 'react';
import { useTheme } from '@mui/material/styles';

// Props interfaces for child components
interface ComparisonControlsProps {
  timeRange: string;
  setTimeRange: (timeRange: string) => void;
  comparisonMetric: string;
  setComparisonMetric: (metric: string) => void;
  benchmark: string;
  setBenchmark: (benchmark: string) => void;
}

const ComparisonControls = ({ 
  timeRange, 
  setTimeRange, 
  comparisonMetric,
  setComparisonMetric, 
  benchmark, 
  setBenchmark 
}: ComparisonControlsProps) => {
  const theme = useTheme();

  return (
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
  );
};

export default ComparisonControls;