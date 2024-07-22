import { updateStockPrice } from "@/api/stock";
import { getUserData } from "@/api/user";
import useGraphData from "@/hooks/useGraphData";
import { useAuth } from "@/contexts/AuthProvider";
import { PercentageChange } from "@/pages/ProtectedRoute";
import { lastUpdateDate } from "@/utils/dataProcessing";
import SyncIcon from "@mui/icons-material/Sync";
import { Box, Button, Typography } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import { useContext, useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router-dom";
import PortfolioValue from "@/components/AnimatedNumber";
import DataGraph from "@/components/DataGraph";
import NewUserNoHoldings from "@/components/NewUserNoHoldings";
import { postSnapshot, getPortfolioSnapshots } from "@/api/portfolioSnapshot";
import { SnapshotChart } from "@/components/SnapShotChart";
import GraphMenu from "@/components/GraphMenu";

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
      className="App"
      sx={{
        display: "flex",
        flexDirection: "row-reverse",
        height: "100%",
        width: "100%",
        margin: "auto",
        paddingTop: 3,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 5,
          width: "30%",
          marginTop: "8%", // This line moves the box down by 30%
        }}
      >
        <Box
          className="stats"
          sx={{
            display: "flex",
            flexDirection: "row",
            paddingLeft: "4em",
            gap: 2,
            alignItems: "center",
          }}
        >
          <Box
            className="portfolio-details"
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
            }}
          >
            <PortfolioValue value={value} />
            {value === 0 ? null : (
              <Typography variant="body1" color="primary">
                {incrementalChange.toLocaleString("en-US")}$ (
                {percentageChange.toLocaleString("en-US")}%) Overall
              </Typography>
            )}
          </Box>
          {value === 0 ? null : (
            <fetcher.Form method="post">
              <input
                type="hidden"
                name="tickers"
                value={stockTickers.join(",")}
              />
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="value" value={value} />
              <Tooltip
                title={`last updated at: ${formattedDate}. Click to refresh Stocks price`}
                placement="top"
              >
                <Button
                  sx={{
                    marginTop: "10px",
                    justifyContent: "flex-end",
                    // color:'#077e5d'
                  }}
                  color="secondary"
                  variant="outlined"
                  type="submit"
                  startIcon={<SyncIcon />}
                ></Button>
              </Tooltip>
            </fetcher.Form>
          )}
        </Box>
        <SnapshotChart
          width={400}
          height={350}
          refreshTrigger={refreshTrigger}
        />
      </Box>
      <Box
        className="graph"
        sx={{
          margin: "auto",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          height: "100%",
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
    </Box>
  );
}

export default App;
