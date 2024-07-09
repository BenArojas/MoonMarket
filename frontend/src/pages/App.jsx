import { updateStockPrice } from "@/api/stock";
import { getUserData } from "@/api/user";
import useGraphData from "@/hooks/useGraphData";
import { useAuth } from "@/pages/AuthProvider";
import { GraphContext } from "@/pages/ProtectedRoute";
import { lastUpdateDate } from "@/utils/dataProcessing";
import SyncIcon from "@mui/icons-material/Sync";
import { Box, Button, Typography } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import { useContext, useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router-dom";
// import DetailsChart from "@/components/DetailsChart";
import PortfolioValue from "@/components/AnimatedNumber";
import DataGraph from "@/components/DataGraph";
import MarketStatus from "@/components/MarketStatus";
import NewUserNoHoldings from "@/components/NewUserNoHoldings";
import { postSnapshot, getPortfolioSnapshots } from "@/api/portfolioSnapshot";
import useSnapshotData from "@/hooks/useSnapshotData";
import LineChart from "@/components/LineGraph";
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
  const { selectedGraph, setPercentageChange } = useContext(GraphContext);
  const { token } = useAuth();
  const fetcher = useFetcher();
  const data = useLoaderData();
  //add that dailty data to the chart
  const [stockTickers, visualizationData, value, moneySpent, isDataProcessed] =
    useGraphData(data, selectedGraph);
  const { formattedDate } = lastUpdateDate(data);
  const incrementalChange = value - moneySpent;
  const percentageChange = (incrementalChange / value) * 100;

  useEffect(() => {
    const newPercentageChange = (incrementalChange / value) * 100;
    setPercentageChange(newPercentageChange);
  }, [incrementalChange, value]);

  return (
    <Box
      className="App"
      sx={{
        display: "flex",
        flexDirection: "row-reverse",
        height: "100%",
        width: "100%",
        margin: "auto",
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
          }}
        >
          <Box
            className="portfolio-details"
            sx={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <PortfolioValue value={value} />
            {value === 0 ? null : (
              <Typography variant="body1" color={"#596ee7"}>
                {incrementalChange.toLocaleString("en-US")}$ (
                {percentageChange.toLocaleString("en-US")}%) Overall
              </Typography>
            )}
            <MarketStatus />
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
                  }}
                  variant="outlined"
                  type="submit"
                  startIcon={<SyncIcon />}
                ></Button>
              </Tooltip>
            </fetcher.Form>
          )}
        </Box>
        <SnapshotChart width={400} height={350} />
      </Box>
      <Box
        className="graph"
        sx={{
          margin: "auto",
          padding: 0,
          display: "flex",
          flexDirection:'column',
          height:'100%'
        }}
      >
        {data.data.holdings.length > 0 ? <GraphMenu/> : null}
        {data.data.holdings.length === 0 ? (
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
