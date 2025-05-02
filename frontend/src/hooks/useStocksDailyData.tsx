import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getStockData } from "@/api/stock";

// Define interfaces for the stocksData structure
interface Stock {
  name: string;
  ticker: string;
  value: number;
}

interface StockGroup {
  name: string;
  value: number;
  children: Stock[];
}

interface StocksData {
  name: string;
  value: number;
  children: StockGroup[];
}

export interface StockData {
  avgVolume: number;
  change: number;
  changesPercentage: number;
  dayHigh: number;
  dayLow: number;
  earningsAnnouncement: string;
  eps: number;
  exchange: string;
  marketCap: number;
  name: string;
  open: number;
  pe: number;
  previousClose: number;
  price: number;
  priceAvg50: number;
  priceAvg200: number;
  sharesOutstanding: number;
  symbol: string;
  timestamp: number;
  volume: number;
  yearHigh: number;
  yearLow: number;
}

// Define return type
export interface StocksDailyDataResult {
  data: Record<string, number> | null;
  isLoading: boolean;
  isError: boolean;
}

export function useStocksDailyData(
  stocksData: StocksData | undefined,
  isDailyView: boolean
): StocksDailyDataResult {
  const queryClient = useQueryClient();
  const tickers: string[] = stocksData?.children?.flatMap(group =>
    group.children.map(stock => stock.ticker)
  ) || [];

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
  }, [isDailyView, queryClient, tickers]);

  if (!isDailyView) {
    return { data: null, isLoading: false, isError: false };
  }

  const isLoading = queries.some(query => query.isLoading);
  const isError = queries.some(query => query.isError);
  const data = queries.reduce((acc: Record<string, number>, query, index) => {
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