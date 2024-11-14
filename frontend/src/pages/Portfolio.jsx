import { getPortfolioSnapshots, postSnapshot } from "@/api/portfolioSnapshot";
import { getHistoricalData } from "@/api/stock";
import { getUserData } from "@/api/user";
import GraphMenu from "@/components/GraphMenu";
import NewUserNoHoldings from "@/components/NewUserNoHoldings";
import { useAuth } from "@/contexts/AuthProvider";
import useGraphData from "@/hooks/useGraphData";
import { PercentageChange } from "@/pages/Layout";
import { lastUpdateDate } from "@/utils/dataProcessing";
import { Box, Stack, CircularProgress, Card } from "@mui/material";
import React, { useContext, useEffect, useState, useRef  } from "react";
import DataGraph from "@/components/DataGraph";
import SnapshotChart from "@/components/SnapShotChart";
import CurrentStockCard from "@/components/CurrentStock";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import GraphSkeleton from "@/Skeletons/GraphSkeleton";
import { ErrorBoundary } from "react-error-boundary";
import { useStockPriceUpdate } from '@/hooks/useStockPriceUpdate'
import { useLocation } from "react-router-dom";


function ErrorFallback({ error }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{ color: "red" }}>{error.message}</pre>
    </div>
  );
}

function Portfolio({ userName }) {
  const [searchParams] = useSearchParams();
  const { state } = useLocation(); // Get location state
  const selectedTicker = searchParams.get("selected") || "BTCUSD"; // Default to 'BTCUSD' if not specified
  const queryClient = useQueryClient();
  const updateStockPricesMutation = useStockPriceUpdate();
  const initialFetchRef = useRef(false);  // Add this

  const { data: userData, isPending: userDataLoading } = useQuery({
    queryKey: ["userData", userName],
    queryFn: getUserData,
  });
  console.log(userData)

  // for developing, on prod we will have an update twice a day
  useEffect(() => {
    if (!initialFetchRef.current && userData && state?.shouldUpdatePrices && userData?.holdings?.length > 0) {
      const tickers = userData.holdings.map(holding => holding.ticker);
      updateStockPricesMutation.mutate(tickers);
      initialFetchRef.current = true;  
    }
  }, [userData, state?.shouldUpdatePrices]);

  const { data: stockData, isPending: stockDataLoading } = useQuery({
    queryKey: ["stockData", selectedTicker],
    queryFn: () => getHistoricalData(selectedTicker),
    enabled: !!selectedTicker,
    staleTime: 120 * 1000,
  });

  const { data: dailyTimeFrame, isPending: dailyTimeFrameLoading } = useQuery({
    queryKey: ["dailyTimeFrame", userName],
    queryFn: () => getPortfolioSnapshots(),
  });

  useEffect(() => {
    queryClient.invalidateQueries(["stockData", selectedTicker]);
  }, [selectedTicker, , queryClient]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1000px auto",
        paddingY: 1,
        paddingX: 5,
        marginX: 5,
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
          {userDataLoading ? (
            <GraphSkeleton />
          ) : (
            <PortfolioContent userData={userData} />
          )}
        </ErrorBoundary>
      </Box>
      <Box sx={{ width: 600, ml: "auto" }}>
        <Stack spacing={3} sx={{ height: "100%" }}>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            {dailyTimeFrameLoading || userDataLoading ? (
              <GraphSkeleton />
            ) : (
              <StackedCardsWrapper
                dailyTimeFrame={dailyTimeFrame}
                userData={userData}
                updateStockPricesMutation={updateStockPricesMutation}
              />
            )}
          </ErrorBoundary>

          <ErrorBoundary FallbackComponent={ErrorFallback}>
            {stockDataLoading ? (
              <Box sx={{
                height: 350
              }}><GraphSkeleton /></Box>
            ) : (
              <CurrentStockCard
                stockData={stockData.historical}
                stockTicker={selectedTicker}
              />
            )}
          </ErrorBoundary>
        </Stack>
      </Box>
    </Box>
  );
}

function PortfolioContent({ userData }) {
  const [selectedGraph, setSelectedGraph] = useState("Treemap");
  const { visualizationData, isDataProcessed, value } = useGraphData(
    userData,
    selectedGraph
  );

  const queryClient = useQueryClient();
  const postSnapshotMutation = useMutation({
    mutationFn: postSnapshot,
    onSuccess: () => {
      queryClient.invalidateQueries(["dailyTimeFrame"]);
    },
    onError: (error) => {
      console.error("Error posting a snapshot", error);
    },
  });

  useEffect(() => {
    if (visualizationData != null) {
      postSnapshotMutation.mutate({ value: value });
    }
  }, [value]);

  if (userData.holdings.length === 0) {
    return <NewUserNoHoldings />;
  }

  return (
    <>
      <GraphMenu
        selectedGraph={selectedGraph}
        setSelectedGraph={setSelectedGraph}
      />
      {postSnapshotMutation.error?.message}
      <DataGraph
        isDataProcessed={isDataProcessed}
        selectedGraph={selectedGraph}
        visualizationData={visualizationData}
      />
    </>
  );
}

const StackedCardsWrapper = ({ dailyTimeFrame, userData, updateStockPricesMutation }) => {
  const { percentageChange, setPercentageChange } =
    useContext(PercentageChange);
  const { stockTickers, value, moneySpent } = useGraphData(userData, "Treemap");
  const formattedDate = lastUpdateDate(userData);
  const incrementalChange = value - moneySpent;

  useEffect(() => {
    if (moneySpent !== 0 && setPercentageChange) {
      const newPercentageChange = (incrementalChange / moneySpent) * 100;
      setPercentageChange(newPercentageChange);
    }
  }, [incrementalChange, moneySpent]);

  return (
    <SnapshotChart
      moneySpent={moneySpent}
      formattedDate={formattedDate}
      stockTickers={stockTickers}
      incrementalChange={incrementalChange}
      percentageChange={percentageChange}
      value={value}
      dailyTimeFrameData={dailyTimeFrame}
      updateStockPricesMutation={updateStockPricesMutation}
    />
  );
};

export default Portfolio;
