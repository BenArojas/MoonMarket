import { getStockData, StockData } from "@/api/stock";
import { ChartDataBars, fetchHistoricalStockDataBars } from "@/api/user";
import CandleStickChart from "@/components/charts/CandleSticksChart";
import SearchBar from "@/components/SearchBar.tsx";
import StockInfoCard from "@/pages/StockItem/StockInfoCard";
import {
  Box,
  CircularProgress,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Suspense, useEffect, useState } from "react";
import { Await, LoaderFunctionArgs, useLoaderData, useSearchParams } from "react-router-dom";

const defaultTime = "7D";

type TransformedChartData = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

interface LoaderData {
  historicalData: Promise<ChartDataBars[]>;
  stock: Promise<StockData | null>;
}

export async function loader({ params, request }: LoaderFunctionArgs): Promise<LoaderData> {
  // containing your URL parameters.
  const { stockTicker } = params;

  if (!stockTicker) {
    throw new Response("Not Found", { status: 404, statusText: "Stock ticker is required." });
  }

  // The rest of your code works perfectly.
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get("time") || defaultTime;

  const stock = getStockData(stockTicker);
  const intradayData = fetchHistoricalStockDataBars(stockTicker, searchTerm);

  return {
    historicalData: intradayData,
    stock: stock,
  };
}

function StockItem() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { stock: stockPromise, historicalData: historicalDataPromise } =
    useLoaderData() as LoaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  

  const currentRange = searchParams.get("time") || defaultTime;


  const handleRangeChange = (newRange: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("time", newRange);
    setSearchParams(newSearchParams); 
  };

  return (
    <Box
      className="layoutContainer"
      sx={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: isMobile ? 2 : 5,
        margin: "auto",
        width: isMobile ? "95%" : "80%",
      }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <Await resolve={stockPromise}>
          {(resolvedStock: StockData | null) =>
            resolvedStock === null ? (
              <NoStockFound />
            ) : (
              <>
                <StockHeader
                  stock={resolvedStock}
                  onRangeChange={handleRangeChange}
                  currentRange={currentRange}
                  isMobile={isMobile}
                />
                <Suspense fallback={<ChartLoadingFallback />}>
                  {/* 3. Await the historical data promise */}
                  <Await resolve={historicalDataPromise}>
                    {/* 4. Process the data right here when it resolves */}
                    {(resolvedHistoricalData: ChartDataBars[]) => {
                      // Perform the transformation logic inside the render prop
                      const transformedForChart = resolvedHistoricalData.map(
                        (point) => ({
                          date: new Date(point.time * 1000).toISOString(),
                          open: point.open,
                          high: point.high,
                          low: point.low,
                          close: point.close,
                          volume: point.volume,
                        })
                      );

                      return (
                        <CandleStickChart
                          data={transformedForChart}
                          isMobile={isMobile}
                        />
                      );
                    }}
                  </Await>
                </Suspense>
              </>
            )
          }
        </Await>
      </Suspense>
    </Box>
  );
}

function LoadingFallback() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "70vh",
      }}
    >
      <CircularProgress />
    </Box>
  );
}

function ChartLoadingFallback() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "400px",
      }}
    >
      <CircularProgress />
    </Box>
  );
}

function NoStockFound() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        alignItems: "center",
      }}
    >
      <Typography>
        Didn't find the ticker you submitted. Please try another ticker.
      </Typography>
    </Box>
  );
}

interface StockHeaderProps {
  stock: StockData; // Use the StockData interface from api/stock.ts
  onRangeChange: (newRange: string) => void;
  currentRange: string;
  isMobile: boolean;
}

function StockHeader({
  stock,
  onRangeChange,
  currentRange,
  isMobile,
}: StockHeaderProps) {
  // Time ranges should align with backend's PERIOD_BAR_MAPPING keys
  const timeRanges = [
    { value: "1D", label: "1 Day" },
    { value: "7D", label: "1 Week" },
    { value: "1M", label: "1 Month" },
    { value: "3M", label: "3 Months" },
    { value: "6M", label: "6 Months" },
    { value: "1Y", label: "1 Year" },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: isMobile ? "flex-start" : "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? 2 : 5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 4,
          alignItems: isMobile ? "flex-start" : "center",
        }}
      >
        <Typography variant="h4">{stock.ticker}</Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 4,
            flexWrap: "wrap",
          }}
        >
          <StockInfoCard label="Last Price" value={stock.last_price} />
          <StockInfoCard label="Previous close" value={stock.previous_close} />
          {/* Ensure changesPercentage is a number from backend */}
          <StockInfoCard
            label="Change (24h)"
            value={`${stock?.change_percent?.toFixed(2)}%`}
          />
          {!isMobile && (
            <>
              <StockInfoCard label="High (24h)" value={stock.dayHigh} />
              <StockInfoCard label="Low (24h)" value={stock.dayLow} />
            </>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: 2,
          alignItems: "center",
          flexWrap: isMobile ? "wrap" : "nowrap",
          marginTop: isMobile ? 2 : 0, // Add some margin for mobile if elements wrap
        }}
      >
        {/* Watchlist button (if you re-enable it) */}
        <Select
          value={currentRange}
          onChange={(e: SelectChangeEvent<string>) =>
            onRangeChange(e.target.value)
          } // Typed event
          size="small"
          sx={{ minWidth: 120 }} // Ensure select has some minimum width
        >
          {timeRanges.map((range) => (
            <MenuItem key={range.value} value={range.value}>
              {range.label}
            </MenuItem>
          ))}
        </Select>
        <Box
          sx={{
            width: isMobile ? (isMobile ? "100%" : 200) : 200,
            marginTop: isMobile ? 1 : 0,
          }}
        >
          {" "}
          {/* Adjust width for mobile */}
          <SearchBar />
        </Box>
      </Box>
    </Box>
  );
}

export default StockItem;
