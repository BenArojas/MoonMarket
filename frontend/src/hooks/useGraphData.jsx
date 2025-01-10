import { useMemo } from "react";
import {
  processTreemapData,
  processDonutData,
  processCircularData,
  processLeaderboardsData,
  getPortfolioStats,
  processSankeyData,
} from "@/utils/dataProcessing.js";
import useHoldingsData from "@/hooks/useHoldingsData";

function useGraphData(userData, selectedGraph, isDailyView) {
  const stockList = userData.holdings;
  const { holdingsData: stocksInfo, isLoading, error } = useHoldingsData(stockList);

  const portfolioStats = (stockList.length > 0 && stocksInfo.length > 0)
    ? getPortfolioStats(stockList, stocksInfo)
    : { tickers: [], sum: 0, totalSpent: 0 };

  const visualizationData = useMemo(() => {
    if (stockList.length === 0 || stocksInfo.length !== stockList.length) return null;

    switch (selectedGraph) {
      case "Treemap":
        return processTreemapData(stockList, stocksInfo, isDailyView);
      case "DonutChart":
        return processDonutData(stockList, stocksInfo);
      case "Circular":
        return processCircularData(stockList, stocksInfo);
      case "Leaderboards":
        return processLeaderboardsData(stockList, stocksInfo);
      case "Sankey":
        return processSankeyData(stockList, stocksInfo);
      default:
        return processTreemapData(stockList, stocksInfo);
    }
  }, [selectedGraph, stockList, stocksInfo, isDailyView]);

  return {
    stockTickers: portfolioStats.tickers,
    visualizationData,
    value: portfolioStats.sum,
    moneySpent: portfolioStats.totalSpent,
    isDataProcessed: stockList.length > 0 && stocksInfo.length > 0,
    isLoading,
    error,
  };
}

export default useGraphData;
