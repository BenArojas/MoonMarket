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

  return defer({
    intradayData: intradayData,
    stock: stock,
  });
}

function StockItem() {
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
        gap: 5,
        margin: "auto",
        width: "80%",
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
                />
                <Suspense fallback={<ChartLoadingFallback />}>
                  {chartData ? (
                    <CandleStickChart data={chartData} />
                  ) : (
                    <ChartLoadingFallback />
                  )}
                </Suspense>
                <BuyStockForm stock={resolvedStock} />
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

function StockHeader({ stock, onRangeChange, currentRange }) {
  console.log(stock)
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
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Box sx={{ display: "flex", gap: 5, alignItems: "center" }}>
        <Typography variant="h4">{stock.symbol}</Typography>
        <StockInfoCard label="Last Price" value={stock.price} />
        <StockInfoCard
          label="Previous close"
          value={stock.previousClose}
        />
        <StockInfoCard label="High (24h)" value={stock.dayHigh} />
        <StockInfoCard label="Low (24h)" value={stock.dayLow} />
        <StockInfoCard
          label="Change (24h)"
          value={`${stock.changesPercentage}%`}
        />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
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
        <SearchBar />
      </Box>
    </Box>
  );
}

export default StockItem;
