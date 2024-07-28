import { updateStockPrice } from "@/api/stock";
import { getUserData } from "@/api/user";
import useGraphData from "@/hooks/useGraphData";
import { useAuth } from "@/contexts/AuthProvider";
import { PercentageChange } from "@/pages/ProtectedRoute";
import { lastUpdateDate } from "@/utils/dataProcessing";
import SyncIcon from "@mui/icons-material/Sync";
import { Box, Button, Typography, Card, Stack, Container } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import { useContext, useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router-dom";
import PortfolioValue from "@/components/AnimatedNumber";
import DataGraph from "@/components/DataGraph";
import NewUserNoHoldings from "@/components/NewUserNoHoldings";
import { postSnapshot, getPortfolioSnapshots } from "@/api/portfolioSnapshot";
import { SnapshotChart } from "@/components/SnapShotChart";
import GraphMenu from "@/components/GraphMenu";
import IconButton from "@mui/material/IconButton";
import { ArrowUp, ArrowDown } from "lucide-react";
import GraphCardSkeleton from '@/Skeletons/GraphCardSkeleton'

export const action = async ({ request }) => {
  const formData = await request.formData();
  const tickers = formData.get("tickers").split(",");
  const token = formData.get("token");
  const value = formData.get("value");

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
    const addPortfolioSnapshot = await postSnapshot(parseFloat(value), token);

    return results;
  } catch (error) {
    console.error("Error updating stock prices:", error);
    return null;
  }
};

export const loader = (token) => async () => {
  const user = await getUserData(token);
  return user;
};

function App() {
  const { percentageChange, setPercentageChange } =
    useContext(PercentageChange);
  const trendColor = percentageChange > 0 ? "primary" : "error";
  const [selectedGraph, setSelectedGraph] = useState("Treemap");
  const { token } = useAuth();
  const fetcher = useFetcher();
  const data = useLoaderData();
  //add that dailty data to the chart
  const [stockTickers, visualizationData, value, moneySpent, isDataProcessed] =
    useGraphData(data, selectedGraph);
  const { formattedDate } = lastUpdateDate(data);
  const incrementalChange = value - moneySpent;
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const newPercentageChange = (incrementalChange / moneySpent) * 100;
    setPercentageChange(newPercentageChange);
  }, [incrementalChange, value]);

  useEffect(() => {
    // This effect will run when the fetcher's data changes
    if (fetcher.data) {
      // Increment the refreshTrigger to cause a re-fetch of snapshot data
      setRefreshTrigger((prev) => prev + 1);
    }
  }, [fetcher.data]);

  return (
    <Box
      id="app"
      sx={{
        display: "flex",
        padding: 2,
        marginX: 4,
      }}
    >
      <Box
        className="graph"
        sx={{
          margin: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {data.holdings.length > 0 ? (
          <GraphMenu
            selectedGraph={selectedGraph}
            setSelectedGraph={setSelectedGraph}
          />
        ) : null}
        {data.holdings.length === 0 ? (
          <NewUserNoHoldings />
        ) : (
          <DataGraph
            isDataProcessed={isDataProcessed}
            selectedGraph={selectedGraph}
            visualizationData={visualizationData}
          />
        )}
      </Box>
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
            refreshTrigger={refreshTrigger}
          />
          <SnapshotChart
            formattedDate={formattedDate}
            stockTickers={stockTickers}
            incrementalChange={incrementalChange}
            percentageChange={percentageChange}
            token={token}
            value={value}
            width={550}
            height={250}
            refreshTrigger={refreshTrigger}
          />
      </Stack>
    </Box>
  );
}

export default App;
