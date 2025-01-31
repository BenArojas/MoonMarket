import { getIntradayData, getStockData } from "@/api/stock";
import BuyStockForm from "@/components/BuyStockForm";
import CandleStickChart from "@/components/CandleSticksChart";
import SearchBar from "@/components/SearchBar.jsx";
import StockInfoCard from "@/components/StockInfoCard";
import {
  Box,
  CircularProgress,
  MenuItem,
  Select,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Suspense, useEffect, useState } from "react";
import {
  Await,
  defer,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

const defaultTime = "1week";

export async function loader({ params, request }) {
  const ticker = params.stockTicker;
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get("time") || defaultTime;

  const stock = getStockData(ticker);
  const intradayData = getIntradayData(ticker, searchTerm);

  return {
    intradayData: intradayData,
    stock: stock,
  }
}

function StockItem() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { stock, intradayData } = useLoaderData();
  const [searchParams] = useSearchParams();
  const [chartData, setChartData] = useState(null);
  const navigate = useNavigate();

  let range = searchParams.get("time") || defaultTime;

  useEffect(() => {
    if (intradayData) {
      intradayData.then((data) => setChartData(data));
    }
  }, [intradayData]);

  const handleRangeChange = async (newRange) => {
    searchParams.set("time", newRange);
    navigate({
      search: searchParams.toString(),
    });
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
        <Await resolve={stock}>
          {(resolvedStock) =>
            resolvedStock === null ? (
              <NoStockFound />
            ) : (
              <>
                <StockHeader
                  stock={resolvedStock}
                  onRangeChange={handleRangeChange}
                  currentRange={range}
                  isMobile={isMobile}
                />
                <Suspense fallback={<ChartLoadingFallback />}>
                  {chartData ? (
                    <CandleStickChart
                      data={chartData}
                      isMobile={isMobile}
                    />
                  ) : (
                    <ChartLoadingFallback />
                  )}
                </Suspense>
                <BuyStockForm isMobile={isMobile} stock={resolvedStock} />
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

function StockHeader({ stock, onRangeChange, currentRange, isMobile }) {
  const timeRanges = [
    { value: "1week", label: "1 Week" },
    { value: "1month", label: "1 Month" },
    { value: "3months", label: "3 Months" },
    { value: "6months", label: "6 Months" },
    { value: "1year", label: "1 Year" },
    { value: "3years", label: "3 Years" },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: isMobile ? "flex-start" : "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? 2 : 5,
        // width: isMobile ? 300: "auto",
      }}
    >
      {/* First Row for Mobile / Main Row for Normal View */}
      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 4,
          alignItems: isMobile ? "flex-start" : "center",
        }}
      >
        <Typography variant="h4">{stock.symbol}</Typography>
        <Box sx={{
          display: "flex",
          flexDirection: "row",
          gap: 4
        }}>
          <StockInfoCard label="Last Price" value={stock.price} />
          <StockInfoCard label="Previous close" value={stock.previousClose} />
          <StockInfoCard label="Change (24h)" value={`${stock.changesPercentage}%`} />
        </Box>
        {!isMobile && (
          <>
            <StockInfoCard label="High (24h)" value={stock.dayHigh} />
            <StockInfoCard label="Low (24h)" value={stock.dayLow} />
          </>
        )}
      </Box>

      {/* Second Row for Mobile / Inline with First Row for Normal View */}
      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "row" : "row",
          gap: 2,
          alignItems: "center",
          flexWrap: isMobile ? "wrap" : "nowrap",
        }}
      >
        <Select
          value={currentRange}
          onChange={(e) => onRangeChange(e.target.value)}
          size="small"
        >
          {timeRanges.map((range) => (
            <MenuItem key={range.value} value={range.value}>
              {range.label}
            </MenuItem>
          ))}
        </Select>
        <Box sx={{
          width: isMobile ? 200 : "100%",
        }}>
          <SearchBar />
        </Box>
      </Box>
    </Box>
  );
}


export default StockItem;
