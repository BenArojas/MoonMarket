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
import { useEffect, useMemo, useReducer } from "react";
import useHoldingsData from "@/hooks/useHoldingsData";

const initialState = {
  stockTickers: [],
  value: 0,
  moneySpent: 0,
  isDataProcessed: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, ...action.payload, isDataProcessed: true };
    default:
      return state;
  }
}

function useGraphData(data, selectedGraph) {
  const { token } = useAuth();
  const stockList = data.holdings;
  const stocksInfo = useHoldingsData(stockList, token);
  
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (data && stocksInfo.length > 0) {
      async function processData() {
        const { tickers, sum, totalSpent } = await getPortfolioStats(stockList, stocksInfo);
        dispatch({ 
          type: 'SET_DATA', 
          payload: { 
            stockTickers: tickers, 
            value: sum, 
            moneySpent: totalSpent 
          } 
        });
      }
      processData();
    }
  }, [data, stocksInfo, stockList]);

  const visualizationData = useMemo(() => {
    if (!state.isDataProcessed) return null;
    switch (selectedGraph) {
      case "Treemap":
        return processTreemapData(stockList, stocksInfo);
      case "DonutChart":
        return processDonutData(stockList, stocksInfo);
      case "Circular":
        return processCircularData(stockList, stocksInfo);
      case "Leaderboards":
        return processLeaderboardsData(stockList, stocksInfo);
      default:
        return processTreemapData(stockList, stocksInfo);
    }
  }, [selectedGraph, stockList, stocksInfo, state.isDataProcessed]);

  return useMemo(() => ({
    stockTickers: state.stockTickers,
    visualizationData,
    value: state.value,
    moneySpent: state.moneySpent,
    isDataProcessed: state.isDataProcessed,
  }), [state, visualizationData]);
}

export default useGraphData;