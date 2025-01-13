import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getStockData } from "@/api/stock";

export function useStocksDailyData(stocksData, isDailyView) {
  const queryClient = useQueryClient();
  const tickers = stocksData?.children?.flatMap(group => 
    group.children.map(stock => stock.ticker)
  ) || [];

  const queries = useQueries({
    queries: tickers.map((ticker) => ({
      queryKey: ['dailyStockData', ticker],
      queryFn: () => getStockData(ticker),
      staleTime: 5 * 60 * 1000,
      enabled: isDailyView ,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false
    })),
  });

  useEffect(() => {
    if (!isDailyView) {
      tickers.forEach(ticker => {
        queryClient.cancelQueries(['dailyStockData', ticker]);
      });
    }
  }, [isDailyView, queryClient, tickers]);

  if (!isDailyView) {
    return { data: null, isLoading: false, isError: false };
  }

  const isLoading = queries.some(query => query.isLoading);
  const isError = queries.some(query => query.isError);
  const data = queries.reduce((acc, query, index) => {
    if (query.data) {
      acc[tickers[index]] = query.data.changesPercentage;
    }
    return acc;
  }, {});

  return {
    data: queries.every(query => query.data) ? data : null,
    isLoading,
    isError
  };
}