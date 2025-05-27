import { StockData } from "@/contexts/StocksDataContext";
import {
  processCircularData,
  processDonutData,
  processLeaderboardsData,
  processSankeyData,
  processTreemapData
} from "@/utils/dataProcessing";
import { useMemo } from "react";

function useGraphData(stocks: { [symbol: string]: StockData }, selectedGraph: string, isDailyView: boolean = false) {
  
    const tickers = Object.keys(stocks);
   

  const visualizationData = useMemo(() => {
    if (!stocks || Object.keys(stocks).length === 0) return null;

    switch (selectedGraph) {
      case "Treemap":
        return processTreemapData(stocks);
      case "DonutChart":
        return processDonutData(stocks);
      case "Circular":
        return processCircularData(stocks);
      case "Leaderboards":
        return processLeaderboardsData(stocks);
      case "Sankey":
        return processSankeyData(stocks);
      default:
        return processTreemapData(stocks);
    }
  }, [selectedGraph, stocks, isDailyView]);

  return {
    stockTickers: tickers,
    visualizationData,
    isDataProcessed: Object.keys(stocks).length > 0,
  };
}

export default useGraphData;