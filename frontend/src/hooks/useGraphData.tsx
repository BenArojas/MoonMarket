import { useMemo } from "react";
import {
  processTreemapData,
  processDonutData,
  processCircularData,
  processLeaderboardsData,
  getPortfolioStats,
  processSankeyData,
} from "@/utils/dataProcessing";
import useHoldingsData from "@/hooks/useHoldingsData";
import { UserData } from "@/contexts/UserContext";





function useGraphData(userData: UserData, selectedGraph: string, isDailyView: boolean = false) {
  const stockList = userData.holdings;
  const { holdingsData, holdingsDataLoading, error } = useHoldingsData(stockList);


  const portfolioStats = (stockList.length > 0 && holdingsData.length > 0)
    ? getPortfolioStats(stockList, holdingsData)
    : { tickers: [], sum: 0, totalSpent: 0 };

  const visualizationData = useMemo(() => {
    if (stockList.length === 0 || holdingsData.length !== stockList.length) return null;

    switch (selectedGraph) {
      case "Treemap":
        return processTreemapData(stockList, holdingsData);
      case "DonutChart":
        return processDonutData(stockList, holdingsData);
      case "Circular":
        return processCircularData(stockList, holdingsData);
      case "Leaderboards":
        return processLeaderboardsData(stockList, holdingsData);
      case "Sankey":
        return processSankeyData(stockList, holdingsData);
      default:
        return processTreemapData(stockList, holdingsData);
    }
  }, [selectedGraph, stockList, holdingsData, isDailyView]);

  return {
    stockTickers: portfolioStats.tickers,
    visualizationData,
    value: portfolioStats.sum,
    moneySpent: portfolioStats.totalSpent,
    isDataProcessed: stockList.length > 0 && holdingsData.length > 0,
    holdingsDataLoading,
    error,
  };
}

export default useGraphData;
