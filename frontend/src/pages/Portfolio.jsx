import { getPortfolioSnapshots, postSnapshot } from "@/api/portfolioSnapshot";
import { getIntradyData, updateStockPrice } from "@/api/stock";
import { getUserData } from "@/api/user";
import GraphMenu from "@/components/GraphMenu";
import NewUserNoHoldings from "@/components/NewUserNoHoldings";
import { useAuth } from "@/contexts/AuthProvider";
import useGraphData from "@/hooks/useGraphData";
import { PercentageChange } from "@/pages/ProtectedRoute";
import { lastUpdateDate } from "@/utils/dataProcessing";
import { Box, Stack, CircularProgress, Card } from "@mui/material";
import React, { useContext, useEffect, useState, lazy, Suspense } from "react";
import { useLoaderData, Await, defer } from "react-router-dom";

// Lazy load components
const DataGraph = lazy(() => import("@/components/DataGraph"));
const SnapshotChart = lazy(() => import("@/components/SnapShotChart"));
const CurrentStockCard = lazy(() => import("@/components/CurrentStock"));

function GraphSkeleton() {
  return (
    <Card
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <CircularProgress />
    </Card>
  );
}

import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({ error }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{ color: "red" }}>{error.message}</pre>
    </div>
  );
}

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
      if (result.status !== "fulfilled") {
        console.error(`Failed to update ${tickers[index]}:`, result.reason);
      }
    });
    return results;
  } catch (error) {
    console.error("Error updating stock prices:", error);
    return null;
  }
};

export const loader =
  (token) =>
    async ({ request }) => {
      const url = new URL(request.url);
      const defaultStockTicker = "BTCUSD";
      const stockTicker = url.searchParams.get("selected") || defaultStockTicker;

      return defer({
        userData: getUserData(token),
        stockData: getIntradyData(stockTicker, token),
        dailyTimeFrame: getPortfolioSnapshots(token),
        stockTicker,
      });
    };

function Portfolio() {
  const { percentageChange, setPercentageChange } =
    useContext(PercentageChange);
  const { token } = useAuth();
  const data = useLoaderData();

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1000px auto",
        padding: 2,
        gap: 4,
        marginX: 9,
        height: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<GraphSkeleton />}>
            <Await resolve={data.userData}>
              {(userData) => (
                <PortfolioContent
                  userData={userData}
                  token={token}
                  percentageChange={percentageChange}
                />
              )}
            </Await>
          </Suspense>
          {/* <GrapthSkeleton /> */}
        </ErrorBoundary>
      </Box>
      <Box sx={{ width: 600, ml: "auto", overflow:'hidden' }}>
        <Stack spacing={2} sx={{ height: "100%" }}>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<GraphSkeleton />}>
              <Await
                resolve={Promise.all([data.dailyTimeFrame, data.userData])}
              >
                {([dailyTimeFrame, userData]) => (
                  <SnapshotChartWrapper
                    dailyTimeFrame={dailyTimeFrame}
                    token={token}
                    userData={userData}
                    percentageChange={percentageChange}
                    setPercentageChange={setPercentageChange}
                  />
                )}
              </Await>
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<GraphSkeleton />}>
              <Await resolve={data.stockData}>
                {(stockData) => (
                  <CurrentStockCard
                    stockData={stockData}
                    token={token}
                    stockTicker={data.stockTicker}
                  />
                )}
              </Await>
            </Suspense>
          </ErrorBoundary>
        </Stack>
      </Box>
    </Box>
  );
}

function PortfolioContent({ userData, token }) {
  const [selectedGraph, setSelectedGraph] = useState("Treemap");
  const { visualizationData, value, isDataProcessed } = useGraphData(userData, selectedGraph, token);

  useEffect(() => {
    postSnapshot(parseFloat(value), token);
  }, [value, token]);

  if (userData.holdings.length === 0) {
    return <NewUserNoHoldings />;
  }

  return (
    <>
      <GraphMenu
        selectedGraph={selectedGraph}
        setSelectedGraph={setSelectedGraph}
      />
      <DataGraph
        isDataProcessed={isDataProcessed}
        selectedGraph={selectedGraph}
        visualizationData={visualizationData}
      />
    </>
  );
}

const SnapshotChartWrapper = ({
  dailyTimeFrame,
  token,
  userData,
  percentageChange,
  setPercentageChange,
}) => {

  const { stockTickers, value, moneySpent } = useGraphData(userData, "Treemap", token);
  const formattedDate = lastUpdateDate(userData);
  const incrementalChange = value - moneySpent;

  useEffect(() => {
    if (moneySpent !== 0) {
      const newPercentageChange = (incrementalChange / moneySpent) * 100;
      setPercentageChange(newPercentageChange);
    }
  }, [incrementalChange, moneySpent]);

  return (
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
  );
};

export default Portfolio;
