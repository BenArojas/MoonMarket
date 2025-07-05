import { getStockData, StockData } from "@/api/stock";
import { ChartDataBars, fetchHistoricalStockDataBars } from "@/api/user";
import CandleStickChart from "@/components/CandleSticksChart";
import SearchBar from "@/components/SearchBar.tsx";
import StockInfoCard from "@/components/StockInfoCard";
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
import { Await, useLoaderData, useSearchParams } from "react-router-dom";

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

export async function loader({
  params,
  request,
}: {
  params: { stockTicker: string };
  request: Request;
}): Promise<LoaderData> {
  const ticker = params.stockTicker;
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get("time") || defaultTime;

  const stock = getStockData(ticker);
  const intradayData = fetchHistoricalStockDataBars(ticker, searchTerm);

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
  const [chartData, setChartData] = useState<TransformedChartData[] | null>(
    null
  );

  const currentRange = searchParams.get("time") || defaultTime;

  useEffect(() => {
    if (historicalDataPromise) {
      historicalDataPromise
        .then((newDataPoints: ChartDataBars[] | null) => {
          // Fixed type here
          if (newDataPoints) {
            const transformedForChart: TransformedChartData[] =
              newDataPoints.map((point) => ({
                date: new Date(point.time * 1000).toISOString(), // Now correctly accessing point.time
                open: point.open,
                high: point.high,
                low: point.low,
                close: point.close,
                volume: point.volume,
              }));
            setChartData(transformedForChart);
          } else {
            setChartData(null);
          }
        })
        .catch((error) => {
          console.error("Error processing historical data:", error);
          setChartData(null);
        });
    }
  }, [historicalDataPromise]);

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
                  {/* Await for historicalDataPromise to resolve before rendering chart or its loader */}
                  <Await resolve={historicalDataPromise}>
                    {() =>
                      chartData ? ( // Check chartData which is set after transformation
                        <CandleStickChart
                          data={chartData} // chartData is now HistoricalDataForChart[]
                          isMobile={isMobile}
                        />
                      ) : (
                        <ChartLoadingFallback /> // Show loading if chartData is not ready
                      )
                    }
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
