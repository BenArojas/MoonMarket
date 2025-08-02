// ComparisonControls.tsx
import React from 'react';
import { useTheme } from '@mui/material/styles';

/* ---- shared literal types ---- */
export type TimeRange =
  | '1D' | '7D' | '1M' | '3M' | '6M' | '1Y';

export type ComparisonMetric = 'percent_change' | 'price';

/* ---- props ---- */
interface ComparisonControlsProps {
  timeRange: TimeRange;
  setTimeRange: React.Dispatch<React.SetStateAction<TimeRange>>;

  comparisonMetric: ComparisonMetric;
  setComparisonMetric?: React.Dispatch<React.SetStateAction<ComparisonMetric>>; // optional

  benchmark: string;
  setBenchmark: React.Dispatch<React.SetStateAction<string>>;
}

const ComparisonControls: React.FC<ComparisonControlsProps> = ({
  timeRange,
  setTimeRange,
  comparisonMetric,
  setComparisonMetric,
  benchmark,
  setBenchmark,
}) => {
  const theme = useTheme();

  return (
    <div
      className="p-4 rounded shadow mb-6"
      style={{ backgroundColor: theme.palette.background.paper }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ------- Time range ------- */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: theme.palette.text.secondary }}
          >
            Time Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="block w-full p-2 rounded border bg-transparent"
            style={{
              borderColor: theme.palette.divider,
              color: theme.palette.text.primary,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <option value="1D">1 Day</option>
            <option value="7D">7 Days</option>
            <option value="1M">1 Month</option>
            <option value="3M">3 Months</option>
            <option value="6M">6 Months</option>
            <option value="1Y">1 Year</option>
          </select>
        </div>

        {/* ------- Metric (show only if setter supplied) ------- */}
        {setComparisonMetric && (
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: theme.palette.text.secondary }}
            >
              Comparison Metric
            </label>
            <select
              value={comparisonMetric}
              onChange={(e) =>
                setComparisonMetric(e.target.value as ComparisonMetric)
              }
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
        )}

        {/* ------- Benchmark ------- */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: theme.palette.text.secondary }}
          >
            Benchmark
          </label>
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
            <option value="SPY">S&amp;P 500 (SPY)</option>
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
