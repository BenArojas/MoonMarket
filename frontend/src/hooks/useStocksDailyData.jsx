import {  useQuery } from "@tanstack/react-query";
import { getStockData } from "@/api/stock";
import React, { useMemo } from "react";


export function useStocksDailyData(stocksData) {
    const tickers = useMemo(() => {
      return stocksData?.children?.flatMap(group => 
        group.children.map(stock => stock.ticker)
      ) || [];
    }, [stocksData]);
  
    return useQuery({
      queryKey: ['dailyStockData', tickers],
      queryFn: async () => {
        const dailyData = {};
        await Promise.all(
          tickers.map(async (ticker) => {
            const data = await getStockData(ticker);
            dailyData[ticker] = data.changesPercentage;
          })
        );
        return dailyData;
      },
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      enabled: tickers.length > 0
    });
  }