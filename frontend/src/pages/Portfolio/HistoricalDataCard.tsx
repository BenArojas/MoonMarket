import api from '@/api/axios';
import { fetchHistoricalStockData, fetchConidForTicker } from '@/api/stock'; 
import { AreaChart, ChartDataPoint } from "@/components/charts/AreaChartLw";
import { ErrorFallback } from "@/components/ErrorFallBack";
import GraphSkeleton from "@/Skeletons/GraphSkeleton";
import "@/styles/App.css";
import { Card, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useSearchParams } from "react-router-dom";




export function HistoricalDataCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ticker = searchParams.get("selected") || "BTC";
  const [selectedPeriod, setSelectedPeriod] = useState<string>("7D"); // Default period

  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod);
  };

  const { data: conidData, isLoading: isLoadingConid } = useQuery({
    queryKey: ['conidForTicker', ticker],
    queryFn: () => fetchConidForTicker(ticker),
    enabled: !!ticker, // Only run if a ticker is present
  });

  const conid = conidData?.conid;
  const companyName = conidData?.companyName || ticker;

  // Step 2: Second query for historical data, which now depends on the conid.
  const {
    data: chartData,
    isLoading: isLoadingHistory,
    isError,
    error,
  } = useQuery<ChartDataPoint[], Error>({
    queryKey: ["historicalStockData", conid, selectedPeriod],
    // Use the fetched conid to call the API function we updated earlier.
    queryFn: () => fetchHistoricalStockData(conid!, selectedPeriod),
    // IMPORTANT: This query will only run if the 'conid' has been successfully fetched.
    enabled: !!conid,
  });


  if (isLoadingConid || isLoadingHistory) {
    return <GraphSkeleton height={320} />;
  }

  if (isError && error) {
    const errorMessage =
      (error as any)?.response?.data?.detail || // For Axios-like errors
      error.message ||
      "Failed to fetch chart data";
    return <p>Error loading chart data: {errorMessage}</p>;
  }

  if (!chartData || chartData.length === 0) {
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
              <MenuItem value="7D">7 Days</MenuItem>
              <MenuItem value="1M">1 Month</MenuItem>
              <MenuItem value="3M">3 Months</MenuItem>
              <MenuItem value="6M">6 Months</MenuItem>
              <MenuItem value="1Y">1 Year</MenuItem>
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
    </ErrorBoundary>
  );
}