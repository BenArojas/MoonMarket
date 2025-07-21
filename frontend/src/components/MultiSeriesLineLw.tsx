// components/charts/MultiSeriesLineLw.tsx

import {  ReturnSeries } from '@/api/user'; 
import { fetchConidForTicker, fetchHistoricalStockData } from '@/api/stock'; 
import { toSeries } from '@/utils/lwHelpers';
import { Skeleton, useTheme } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ChartDataPoint, MultiSeriesLineChart } from './charts/MultiSeriesLineChart';

// Helper to normalize data series for comparison (only needed for absolute price data)
const normalizeData = (data: ChartDataPoint[]): ChartDataPoint[] => {
    if (data.length === 0) return [];
    const baseValue = data[0].value;
    if (!baseValue || baseValue === 0) return data.map(p => ({ ...p, value: 0 }));

    return data.map(point => ({
        time: point.time,
        value: ((point.value / baseValue) - 1) * 100, // Calculate % change
    }));
};

const mapPeriodForHistory = (period: string): string => {
    const periodMap: Record<string, string> = {
      "1D": "1D",
      "7D": "7D", 
      "MTD": "1M",  // Map MTD to 1M
      "1M": "1M",
      "YTD": "1Y",  // Map YTD to 1Y
      "1Y": "1Y"
    };
    
    return periodMap[period] || "1M"; // Default fallback
  };

interface Props {
    portfolioSeries: ReturnSeries;
    period: string;
}

const MultiSeriesLineLw = ({ portfolioSeries, period }: Props) => {
    const theme = useTheme();
    const historyPeriod = mapPeriodForHistory(period);

    const { data: spyConidData, isLoading: isLoadingConid } = useQuery({
        queryKey: ['conidForTicker', 'SPY'],
        queryFn: () => fetchConidForTicker('SPY'),
        staleTime: Infinity, 
      });
      const spyConid = spyConidData?.conid;
    
    const { data: spyData, isLoading: isLoadingHistory, error } = useQuery({
        queryKey: ["historicalData", spyConid, historyPeriod],
        queryFn: () => fetchHistoricalStockData(spyConid!, historyPeriod),
        staleTime: 1000 * 60 * 60, // 1-hour cache
        enabled: !!spyConid,
      });

    // Prepare the series data for the chart
    const comparisonSeries = useMemo(() => {
        if (!spyData || !portfolioSeries) return [];

        // ✨ Corrected Logic:
        // 1. For the portfolio, just convert to series and multiply by 100.
        const normalizedPortfolio = toSeries(
            portfolioSeries.dates,
            portfolioSeries.returns
        ).map(point => ({
            ...point,
            value: point.value * 100, // e.g., 0.2248 -> 22.48
        }));

        // 2. For the S&P 500, use the normalizeData function as before.
        const normalizedSpy = normalizeData(spyData);

        return [
            {
                data: normalizedPortfolio,
                options: { color: theme.palette.primary.main, title: 'My Portfolio' },
            },
            {
                data: normalizedSpy,
                options: { color: theme.palette.grey[500], title: 'S&P 500' },
            },
        ];
    }, [portfolioSeries, spyData, theme]);

    // Handle internal loading and error states
    if (isLoadingHistory) {
        return <Skeleton variant="rectangular" width="100%" height={240} />;
    }

    if (error) {
        return <p className="text-red-600 text-center p-4">Could not load S&P 500 data.</p>;
    }

    return (
        <MultiSeriesLineChart
            series={comparisonSeries}
            height={240}
            priceFormatter={(price: number) => `${price.toFixed(2)}%`}
        />
    );
};

export default MultiSeriesLineLw;