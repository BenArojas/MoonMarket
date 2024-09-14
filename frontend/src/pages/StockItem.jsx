import React, { useState, Suspense, useEffect } from "react";
import { useLoaderData, Await, defer, useRevalidator  } from "react-router-dom";
import { Box, Typography, CircularProgress, Select, MenuItem } from "@mui/material";
import SearchBar from "@/components/SearchBar.jsx";
import CandleStickChart from "@/components/CandleSticksChart";
import StockInfoCard from "@/components/StockInfoCard";
import BuyStockForm from "@/components/BuyStockForm";
import {getIntradayData, getStockData} from '@/api/stock'

export async function loader(ticker) {
  const stock = getStockData(ticker);
  const intradayData = getIntradayData(ticker, '1month'); // Default to 1 month

  return defer({
    intradayData: intradayData,
    stock: stock
  });
}

function StockItem() {
  const { stock, intradayData } = useLoaderData();
  const [range, setRange] = useState('1month');
  const [chartData, setChartData] = useState(null);
  const revalidator = useRevalidator();

  useEffect(() => {
    if (intradayData) {
      intradayData.then(data => setChartData(data));
    }
  }, [intradayData]);

  const handleRangeChange = async (newRange) => {
    setRange(newRange);
    try {
      const resolvedStock = await stock;
      const newData = await getIntradayData(resolvedStock.symbol, newRange);
      setChartData(newData);
    } catch (error) {
      console.error("Error fetching new data:", error);
      // Handle error (e.g., show error message to user)
    }
  };

  return (
    <Box className="layoutContainer" sx={{ display: "grid", gridTemplateRows: "auto 1fr auto", gap: 5, margin: "auto", width: "80%" }}>
      <Suspense fallback={<LoadingFallback />}>
        <Await resolve={stock}>
          {(resolvedStock) => (
            resolvedStock === null ? (
              <NoStockFound />
            ) : (
              <>
                <StockHeader stock={resolvedStock} onRangeChange={handleRangeChange} currentRange={range} />
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
          )}
        </Await>
      </Suspense>
    </Box>
  );
}

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
      <CircularProgress />
    </Box>
  );
}

function ChartLoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
      <CircularProgress />
    </Box>
  );
}

function NoStockFound() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems:'center' }}>
      <Typography>Didn't find the ticker you submitted. Please try another ticker.</Typography>
    </Box>
  );
}

function StockHeader({ stock, onRangeChange, currentRange }) {
  const timeRanges = [
    { value: '1week', label: '1 Week' },
    { value: '1month', label: '1 Month' },
    { value: '3months', label: '3 Months' },
    { value: '6months', label: '6 Months' },
    { value: '1year', label: '1 Year' },
    { value: '3years', label: '3 Years' },
  ];

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <Box sx={{ display: "flex", gap: 5, alignItems: "center" }}>
        <Typography variant="h4">{stock.symbol}</Typography>
        <StockInfoCard label="Last Price" value={stock.price} />
        <StockInfoCard label="Volume" value={stock.volume.toLocaleString("en-US")} />
        <StockInfoCard label="High (24h)" value={stock.dayHigh} />
        <StockInfoCard label="Low (24h)" value={stock.dayLow} />
        <StockInfoCard label="Change (24h)" value={`${stock.changesPercentage}%`} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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