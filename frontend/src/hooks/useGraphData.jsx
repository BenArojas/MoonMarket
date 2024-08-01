import { useAuth } from "@/contexts/AuthProvider";
import "@/styles/App.css";
import "@/styles/portfolio.css";
import {
  processTreemapData,
  getPortfolioStats,
  processDonutData,
  processCircularData,
  processLeaderboardsData,
} from "@/utils/dataProcessing.js";
import { useEffect, useState } from "react";
import useHoldingsData from "@/hooks/useHoldingsData";

function useGraphData(data, selectedGraph) {
  const { token } = useAuth();
  const stockList = data.holdings;
  const stocksInfo = useHoldingsData(stockList, token);

  const [stockTickers, setStockTickers] = useState([]);
  const [treemapData, setTreemapData] = useState(null);
  const [donutData, setDonutData] = useState(null);
  const [circularData, setCircularData] = useState(null);
  const [leaderboardsData, setLeaderboardsData] = useState(null);

  const [value, setValue] = useState(0);
  const [moneySpent, setMoneySpent] = useState(0);
  const [isDataProcessed, setIsDataProcessed] = useState(false);

  useEffect(() => {
    if (data && stocksInfo.length > 0) {
      async function processData() {
        setIsDataProcessed(false);
        console.log("stocks info: " , stocksInfo)
        console.log("stock list: " , stockList)
        const { tickers, sum, totalSpent } = await getPortfolioStats(stockList, stocksInfo);

        setStockTickers(tickers);
        setValue(sum);
        setMoneySpent(totalSpent);

        switch (selectedGraph) {
          case "Treemap":
            setTreemapData(processTreemapData(stockList, stocksInfo));
            break;
          case "DonutChart":
            setDonutData(processDonutData(stockList, stocksInfo));
            break;
          case "Circular":
            setCircularData(processCircularData(stockList, stocksInfo));
            break;
          case "Leaderboards":
            setLeaderboardsData(processLeaderboardsData(stockList, stocksInfo));
            break;
          default:
            setTreemapData(processTreemapData(stockList, stocksInfo));
        }

        setIsDataProcessed(true);
      }

      processData();
    }
  }, [selectedGraph, stocksInfo]);

  const visualizationData = (() => {
    switch (selectedGraph) {
      case "Treemap":
        return treemapData;
      case "DonutChart":
        return donutData;
      case "Circular":
        return circularData;
      case "Leaderboards":
        return leaderboardsData;
      default:
        return treemapData;
    }
  })();

  return [stockTickers, visualizationData, value, moneySpent, isDataProcessed];
}

export default useGraphData;
