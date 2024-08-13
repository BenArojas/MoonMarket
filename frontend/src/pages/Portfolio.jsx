import { getPortfolioSnapshots, postSnapshot } from "@/api/portfolioSnapshot";
import { getIntradyData} from "@/api/stock";
import { getUserData } from "@/api/user";
import GraphMenu from "@/components/GraphMenu";
import NewUserNoHoldings from "@/components/NewUserNoHoldings";
import { useAuth } from "@/contexts/AuthProvider";
import useGraphData from "@/hooks/useGraphData";
import { PercentageChange } from "@/pages/ProtectedRoute";
import { lastUpdateDate } from "@/utils/dataProcessing";
import { Box, Stack, CircularProgress, Card } from "@mui/material";
import React, { useContext, useEffect, useState} from "react";
import DataGraph from "@/components/DataGraph";
import SnapshotChart from "@/components/SnapShotChart";
import CurrentStockCard from "@/components/CurrentStock";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

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

function Portfolio() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedTicker = searchParams.get("selected") || "BTCUSD"; // Default to 'BTCUSD' if not specified
  const queryClient = useQueryClient();

  const { data: userData, isPending: userDataLoading } = useQuery({
    queryKey: ["userData", token],
    queryFn: () => getUserData(token),
  });

  const { data: stockData, isPending: stockDataLoading } = useQuery({
    queryKey: ["stockData", selectedTicker, token],
    queryFn: () => getIntradyData(selectedTicker, token),
    enabled: !!selectedTicker && !!token,
    staleTime: 120 * 1000, 
  });

  const { data: dailyTimeFrame, isPending: dailyTimeFrameLoading } = useQuery({
    queryKey: ["dailyTimeFrame", token],
    queryFn: () => getPortfolioSnapshots(token),
  });


  useEffect(() => {
    queryClient.invalidateQueries(["stockData", selectedTicker, token]);
  }, [selectedTicker, token, queryClient]);

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
          {userDataLoading ? (
            <GraphSkeleton />
          ) : (
            <PortfolioContent userData={userData} token={token} />
          )}
        </ErrorBoundary>
      </Box>
      <Box sx={{ width: 600, ml: "auto", overflow: "hidden" }}>
        <Stack spacing={2} sx={{ height: "100%" }}>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            {(dailyTimeFrameLoading || userDataLoading) ? (
              <GraphSkeleton />
            ) : (
              <SnapshotChartWrapper
                dailyTimeFrame={dailyTimeFrame}
                token={token}
                userData={userData}
              />
            )}
          </ErrorBoundary>

          <ErrorBoundary FallbackComponent={ErrorFallback}>
            {stockDataLoading ? (
              <GraphSkeleton />
            ) : (
              <CurrentStockCard
                stockData={stockData}
                token={token}
                stockTicker={selectedTicker}
              />
            )}
          </ErrorBoundary>
        </Stack>
      </Box>
    </Box>
  );
}

function PortfolioContent({ userData, token }) {
  const [selectedGraph, setSelectedGraph] = useState("Treemap");
  const { visualizationData, isDataProcessed, value } = useGraphData(
    userData,
    selectedGraph,
    token
  );


  const queryClient = useQueryClient()
  const postSnapshotMutation = useMutation({
    mutationFn: postSnapshot,
    onSuccess: (data) => {
      queryClient.invalidateQueries(["dailyTimeFrame"]) // Invalidate the dailyTimeFrame query when the snapshot is posted
    },
    onError: (error) => {
      console.error("Error posting a snapshot", error);
    }
  })


  useEffect(() => {
    if (value != 0 && token) {
      postSnapshotMutation.mutate({ value: value, token: token });
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

const SnapshotChartWrapper = ({ dailyTimeFrame, token, userData }) => {
  const { percentageChange, setPercentageChange } =
    useContext(PercentageChange);
  const { stockTickers, value, moneySpent } = useGraphData(
    userData,
    "Treemap",
    token
  );
  const formattedDate = lastUpdateDate(userData);
  const incrementalChange = value - moneySpent;
  // console.log("percentageChange is " + percentageChange )

  useEffect(() => {
    if (moneySpent !== 0 && setPercentageChange) {
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
