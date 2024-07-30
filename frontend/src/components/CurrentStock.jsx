import { createChart, ColorType } from "lightweight-charts";
import React, { useEffect, useRef } from "react";
import { Box, Card, Stack, Typography, useTheme, Button } from "@mui/material";
import {getHistoricalData} from '@/api/stock'

function transformData(historicalData) {
    return historicalData
      .map(item => ({
        time: new Date(item.date).getTime() / 1000, // Convert to Unix timestamp
        value: item.close
      }))
      .sort((a, b) => a.time - b.time); // Sort in ascending order
  }

export const CurrentStockChart = (props) => {
  const theme = useTheme();
  const {
    data,
    colors: {
      backgroundColor = "transparent",
      lineColor = theme.palette.primary.main,
      textColor = theme.palette.text.primary,
      areaTopColor = theme.palette.primary.main,
      areaBottomColor = "transparent",
    } = {},
  } = props;

  const chartContainerRef = useRef();

  useEffect(() => {
    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
        attributionLogo: false,
      },
      grid: {
        horzLines: {
          color: theme.palette.text.disabled,
          visible: false,
        },
        vertLines: {
          color: theme.palette.text.disabled,
          visible: false,
        },
      },

      width: chartContainerRef.current.clientWidth,
      height: 250,
    });
    chart.timeScale().fitContent();

    const newSeries = chart.addAreaSeries({
      lineColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
      lineType: 0,
    });
    newSeries.setData(data);

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);

      chart.remove();
    };
  }, [
    data,
    backgroundColor,
    lineColor,
    textColor,
    areaTopColor,
    areaBottomColor,
  ]);

  return <div ref={chartContainerRef} />;
};



export default function CurrentStockCard({props, stockData}) {
    console.log(stockData)
    const ticker = stockData.symbol
    const historicalData = stockData.historical
    const transformedData = transformData(historicalData);


  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        margin: "auto",
        padding: "10px 15px",
        backgroundColor: "transparent",
      }}
    >
      <Box
        className="stats"
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          p: 1,
          gap: 6,
        }}
      >
        <Typography variant="h5">{ticker}</Typography>
        <Box sx={{ shrink: 0 }}>
          <Typography variant="overline" color="GrayText">
            High (24h)
          </Typography>
          <Typography variant="body2">22.9</Typography>
        </Box>
        <Box sx={{ shrink: 0 }}>
          <Typography variant="overline" color="GrayText">
            Low (24h)
          </Typography>
          <Typography variant="body2">20.45</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, ml: "auto" }}>
          <Button variant="contained" color="error">
            Sell
          </Button>
          <Button variant="contained">Buy</Button>
        </Box>
      </Box>
      <CurrentStockChart {...props} data={transformedData}></CurrentStockChart>
    </Card>
  );
}
