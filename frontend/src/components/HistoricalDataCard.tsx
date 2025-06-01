import { fetchHistoricalStockData } from "@/api/user";
import CurrentStockCard from "@/components/CurrentStock";
import { ErrorFallback } from "@/components/ErrorFallBack";
import GraphSkeleton from "@/Skeletons/GraphSkeleton";
import "@/styles/App.css";
import { Card, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useSearchParams } from "react-router-dom";
import { AreaChart, ChartDataPoint } from "./CurrentStockChart";

export function HistoricalDataCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ticker = searchParams.get("selected") || "BTC";
  const [selectedPeriod, setSelectedPeriod] = useState<string>("1Y"); // Default period
  const [selectedBar, setSelectedBar] = useState<string>("1h");

  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod);
  };

  const handleBarChange = (newBar: string) => {
    setSelectedBar(newBar);
  };

  const {
    data: chartData,
    isLoading,
    isError,
    error,
  } = useQuery<ChartDataPoint[], Error>({
    queryKey: ["historicalStockData", ticker, selectedPeriod, selectedBar],
    queryFn: () =>
      fetchHistoricalStockData(ticker, selectedPeriod, selectedBar),
  });

  console.log({ chartData });

  if (isLoading) return <GraphSkeleton />;

  // Handle error state
  if (isError && error) {
    // Check if error object exists
    // Axios errors often have a `response` property for server-side errors
    const errorMessage =
      (error as any)?.response?.data?.detail ||
      error.message ||
      "Failed to fetch chart data";
    return <p>Error loading chart data: {errorMessage}</p>;
  }

  // Handle case where data might be undefined (e.g., initial state before first fetch or after an error without data)
  // or if the API returns an empty array.
  if (!chartData || chartData.length === 0) {
    // If not loading and not an error, but no data, it means an empty response or the query hasn't run.
    // We can be more specific if needed based on other flags from useQuery like `isSuccess`.
    return <p>No Stock data available for the selected period.</p>;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Card
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          padding: "10px 15px",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          spacing={2}
          alignItems="center"
        >
          <Typography variant="h5">{ticker}</Typography>
          <div>
            {/* dropdown menu for period */}

            <TextField
              select
              size="small"
              label="Selected Period"
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="1D">Last Day</MenuItem>
              <MenuItem value="7D"> 7 Days</MenuItem>
              <MenuItem value="1M">1 Month</MenuItem>
              <MenuItem value="3M">Year to date </MenuItem>
              <MenuItem value="6M">Year to date </MenuItem>
              <MenuItem value="1Y">1 Year</MenuItem>
            </TextField>
            {/* dropdown menu for Bars */}
            <TextField
              select
              size="small"
              label="Selected Bar"
              value={selectedBar}
              onChange={(e) => handleBarChange(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="1min">1 Min</MenuItem>
              <MenuItem value="5min"> 5 Min</MenuItem>
              <MenuItem value="15min">15 Min</MenuItem>
              <MenuItem value="30min">30 Min</MenuItem>
              <MenuItem value="1h">1 Hour </MenuItem>
              <MenuItem value="1d">1 Day</MenuItem>
            </TextField>
          </div>
        </Stack>
        <AreaChart
          data={chartData}
          colors={{
            lineColor: "#E1E5EB",
            areaTopColor: "#E1E5EB",
          }}
          height={260}
        />
      </Card>
      {/* <CurrentStockCard stockData={chartData} stockTicker={ticker} /> */}
    </ErrorBoundary>
  );
}
