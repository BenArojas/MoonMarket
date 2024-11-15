import { useMemo } from "react";
import {
  processTreemapData,
  processDonutData,
  processCircularData,
  processLeaderboardsData,
  getPortfolioStats, processSankeyData
} from "@/utils/dataProcessing.js";
import useHoldingsData from "@/hooks/useHoldingsData";

function useGraphData(userData, selectedGraph ) {
  const stockList = userData.holdings;
  const stocksInfo = useHoldingsData(stockList, userData);

  const portfolioStats = useMemo(() => {
    if (stockList.length > 0 && stocksInfo.length > 0) {
      return getPortfolioStats(stockList, stocksInfo);
    }
    return { tickers: [], sum: 0, totalSpent: 0 };
  }, [stockList, stocksInfo]);

  const visualizationData = useMemo(() => {
    if (stockList.length === 0 || stocksInfo.length !== stockList.length) return null;

    switch (selectedGraph) {
      case "Treemap":
        return processTreemapData(stockList, stocksInfo);
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
  }, [selectedGraph, stockList, stocksInfo]);

  return {
    stockTickers: portfolioStats.tickers,
    visualizationData,
    value: portfolioStats.sum,
    moneySpent: portfolioStats.totalSpent,
    isDataProcessed: stockList.length > 0 && stocksInfo.length > 0
  };
}

export default useGraphData;