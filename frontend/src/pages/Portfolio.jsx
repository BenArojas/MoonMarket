import { getPortfolioSnapshots, postSnapshot } from "@/api/portfolioSnapshot";
import {
  getIntradyData,
  updateStockPrice
} from "@/api/stock";
import { getUserData } from "@/api/user";
import CurrentStockCard from "@/components/CurrentStock";
import DataGraph from "@/components/DataGraph";
import GraphMenu from "@/components/GraphMenu";
import NewUserNoHoldings from "@/components/NewUserNoHoldings";
import { SnapshotChart } from "@/components/SnapShotChart";
import { useAuth } from "@/contexts/AuthProvider";
import useGraphData from "@/hooks/useGraphData";
import { PercentageChange } from "@/pages/ProtectedRoute";
import { lastUpdateDate } from "@/utils/dataProcessing";
import { Box, Stack } from "@mui/material";
import { useContext, useEffect, useState, Suspense } from "react";
import { useLoaderData, Await, defer } from "react-router-dom";

export const action = async ({ request }) => {
  const formData = await request.formData();
  const tickers = formData.get("tickers").split(",");
  const token = formData.get("token");

  if (!tickers || tickers.length === 0) {
    console.warn("No tickers available for price update.");
    return null;
  }

  if (!token) {
    console.warn("No authentication token available.");
    return null;
  }

  try {
    const promises = tickers.map((ticker) => updateStockPrice(ticker, token));
    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        // console.log(`Successfully updated ${tickers[index]}:`, result.value);
      } else {
        console.error(`Failed to update ${tickers[index]}:`, result.reason);
      }
    });
    return results;
  } catch (error) {
    console.error("Error updating stock prices:", error);
    return null;
  }
};

export const loader = (token) => async ({ request }) => {
  const url = new URL(request.url);
  const defaultStockTicker = "BTCUSD";
  const stockTicker = url.searchParams.get("selected") || defaultStockTicker;

  return defer({
    userData: getUserData(token),
    stockData: getIntradyData(stockTicker, token),
    dailyTimeFrame: getPortfolioSnapshots(token),
    stockTicker: stockTicker,
  });
};

function Portfolio() {
  const { percentageChange, setPercentageChange } = useContext(PercentageChange);
  const [selectedGraph, setSelectedGraph] = useState("Treemap");
  const { token } = useAuth();
  const data = useLoaderData();

  return (
    <Box sx={{
      display: "grid",
      gridTemplateColumns: "1000px auto",
      padding: 2,
      gap: 4,
      marginX: 9,
    }}>
      <Suspense fallback={<div>Loading...</div>}>
        <Await 
          resolve={Promise.all([data.userData, data.stockData, data.dailyTimeFrame])}
          errorElement={<p>Error loading data</p>}
        >
          {([userData, stockData, dailyTimeFrame]) => (
            <PortfolioContent 
              userData={userData}
              stockData={stockData}
              dailyTimeFrame={dailyTimeFrame}
              stockTicker={data.stockTicker}
              selectedGraph={selectedGraph}
              setSelectedGraph={setSelectedGraph}
              percentageChange={percentageChange}
              setPercentageChange={setPercentageChange}
              token={token}
            />
          )}
        </Await>
      </Suspense>
    </Box>
  );
}

function PortfolioContent({ 
  userData, 
  stockData, 
  dailyTimeFrame, 
  stockTicker, 
  selectedGraph, 
  setSelectedGraph, 
  percentageChange, 
  setPercentageChange, 
  token 
}) {
  const [stockTickers, visualizationData, value, moneySpent, isDataProcessed] = useGraphData(userData, selectedGraph);
  const { formattedDate } = lastUpdateDate(userData);
  const incrementalChange = value - moneySpent;

  useEffect(() => {
    const newPercentageChange = (incrementalChange / moneySpent) * 100;
    setPercentageChange(newPercentageChange);
  }, [incrementalChange, value]);

  useEffect(() => {
    postSnapshot(parseFloat(value), token);
  }, [value])

  return (
    <>
      <Box sx={{
        display: "flex",
        flexDirection: "column",
      }}>
        {userData.holdings.length > 0 ? (
          <GraphMenu
            selectedGraph={selectedGraph}
            setSelectedGraph={setSelectedGraph}
          />
        ) : null}
        {userData.holdings.length === 0 ? (
          <NewUserNoHoldings />
        ) : (
          <DataGraph
            isDataProcessed={isDataProcessed}
            selectedGraph={selectedGraph}
            visualizationData={visualizationData}
          />
        )}
      </Box>
      <Box sx={{width:600, ml:'auto'}}>
        <Stack spacing={2}>
          <SnapshotChart
            formattedDate={formattedDate}
            stockTickers={stockTickers}
            incrementalChange={incrementalChange}
            percentageChange={percentageChange}
            token={token}
            value={value}
            width={550}
            height={250}
            dailyTimeFrameData={dailyTimeFrame}
          />
          <CurrentStockCard
            stockData={stockData}
            token={token}
            stockTicker={stockTicker}
          />
        </Stack>
      </Box>
    </>
  );
}

export default Portfolio;
