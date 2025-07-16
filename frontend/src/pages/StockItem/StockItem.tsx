import { startTransition, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useStockStore } from "@/stores/stockStore";
import api from "@/api/axios"; // Your axios instance

// We'll create these components next, for now imagine they exist

import { Box, CircularProgress } from "@mui/material";
import LiveQuoteDisplay from "./LiveQuoteDisplay";
import CandleStickChart from "@/components/charts/CandleSticksChart";
import OrderPanel from "./OrderPanel";
import DepthOfBookTable from "./DepthOfBookTable";

// This will hold the static data like name, conid, and historical chart data
interface StaticStockInfo {
  conid: number;
  ticker: string;
  companyName: string;
  chartData: any[]; // The data for your candlestick chart
}

export default function StockItem() {
  const { stockTicker } = useParams<{ stockTicker: string }>();
  const [staticInfo, setStaticInfo] = useState<StaticStockInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Get actions and live data from our Zustand store
  const activeStock = useStockStore((state) => state.activeStock);
  const subscribeToStock = useStockStore((state) => state.subscribeToStock);
  const unsubscribeFromStock = useStockStore(
    (state) => state.unsubscribeFromStock
  );

  useEffect(() => {
    let conid: number | null = null;

    const setupPage = async () => {
      if (!stockTicker) return;

      setIsLoading(true);
      try {
        // A. Fetch initial, static data once on page load (conid, historical data)
        const quoteResponse = await api.get(`/market/quote/${stockTicker}`);
        const historyResponse = await api.get("/market/history", { params: { ticker: stockTicker, period: '1M' } });

        conid = quoteResponse.data.conid;

        startTransition(() => {
          setStaticInfo({
              conid: conid,
              ticker: stockTicker,
              companyName: quoteResponse.data.company_name || 'N/A',
              chartData: historyResponse.data,
          });

          if (conid) {
            subscribeToStock(conid, stockTicker);
          }

          setIsLoading(false); // It's good practice to include this inside as well
        });

      } catch (error) {
        console.error("Failed to setup stock page:", error);
        // Also wrap the error-case state update
        startTransition(() => {
          setIsLoading(false);
      });
      }
    };

    setupPage();

    // C. The cleanup function: This is crucial!
    // It runs when you navigate away from this page.
    return () => {
      if (conid) {
        unsubscribeFromStock(conid);
      }
    };
  }, [stockTicker]); 

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!staticInfo) {
    return <Box>Stock not found.</Box>;
  }

  // 3. The page now renders the live data from `activeStock`
  return (
    <Box className="layoutContainer">
      <h2>
        {staticInfo.companyName} ({staticInfo.ticker})
      </h2>

      <div
        className="main-content-grid"
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}
      >
        <div className="chart-and-info">
          <LiveQuoteDisplay quote={activeStock.quote} />
          <CandleStickChart data={staticInfo.chartData} />
        </div>

        <div className="trading-panel">
          <OrderPanel conid={staticInfo.conid} />
          <DepthOfBookTable depth={activeStock.depth} />
        </div>
      </div>
    </Box>
  );
}
