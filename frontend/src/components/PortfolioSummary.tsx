import React from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDate } from '@/utils/dataProcessing';


interface PortfolioSummaryProps {
  portfolioPerformance: any;
  portfolioChartData: any[];
  timeRange: string;
  benchmark: string;
}

const PortfolioSummary = ({ 
  portfolioPerformance, 
  portfolioChartData, 
  timeRange, 
  benchmark,
}: PortfolioSummaryProps) => {
  const theme = useTheme();


  return (
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

      {/* Portfolio Performance Chart */}
      {portfolioChartData.length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-4" style={{ color: theme.palette.text.primary }}>
            Simulated Portfolio Return vs {benchmark} ({timeRange})
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={portfolioChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
                  tickFormatter={(value) => `${value?.toFixed(0)}%`}
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
                  formatter={(value, name) => {
                    const label = name;
                    const formattedValue = `${(value as number).toFixed(2)}%`;
                    return [formattedValue, label];
                  }}
                />
                <Legend wrapperStyle={{ color: theme.palette.text.primary, fontSize: '0.8rem', paddingTop: '10px' }} />
                <Line
                  key="portfolio"
                  type="monotone"
                  dataKey="portfolio"
                  name="Your Portfolio"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={true}
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
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioSummary;