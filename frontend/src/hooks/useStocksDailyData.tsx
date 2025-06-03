import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { getStockData, StockData } from "@/api/stock";
import { TreemapData } from "@/utils/dataProcessing";


// Define return type
export interface StocksDailyDataResult {
  data: Record<string, number> | null;
  isLoading: boolean;
  isError: boolean;
}

export function useStocksDailyData(
  stocksData: TreemapData | undefined, // Allow undefined to match component usage
  isDailyView: boolean
): StocksDailyDataResult {
  const queryClient = useQueryClient();
  
  // Memoize the tickers array to prevent unnecessary re-renders and Fast Refresh issues
  const tickers = useMemo(() => {
    return stocksData?.children?.flatMap(group =>
      group.children.map(stock => stock.ticker)
    ) || [];
  }, [stocksData]);

  const queries = useQueries({
    queries: tickers.map((ticker) => ({
      queryKey: ['dailyStockData', ticker],
      queryFn: () => getStockData(ticker) as Promise<StockData>,
      staleTime: 5 * 60 * 1000,
      enabled: isDailyView,
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false
    })),
  });

  useEffect(() => {
    if (!isDailyView) {
      tickers.forEach(ticker => {
        queryClient.cancelQueries({ queryKey: ['dailyStockData', ticker] });
      });
    }
  }, [isDailyView, tickers, queryClient]); // Include all dependencies

  if (!isDailyView) {
    return { data: null, isLoading: false, isError: false };
  }

  const isLoading = queries.some(query => query.isLoading);
  const isError = queries.some(query => query.isError);
  const data = queries.reduce((acc: Record<string, number>, query, index) => {
    if (query.data) {
      acc[tickers[index]] = query.data.change_percent;
    }
    return acc;
  }, {});

  return {
    data: queries.every(query => query.data) ? data : null,
    isLoading,
    isError
  };
}