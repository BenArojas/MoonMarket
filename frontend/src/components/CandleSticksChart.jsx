import { createChart, ColorType } from "lightweight-charts";
import React, { useEffect, useRef } from "react";
import { useTheme } from "@mui/material";

// Add this function to transform your data
function transformData(historicalData) {
  return historicalData
    .map(item => ({
      time: new Date(item.date).getTime() / 1000, // Convert to Unix timestamp
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close
    }))
    .sort((a, b) => a.time - b.time); // Sort in ascending order
}

export const ChartComponent = (props) => {
  const theme = useTheme();
  const {
    data,
    colors: {
      backgroundColor = "transparent",
      lineColor = "#2962FF",
      textColor = theme.palette.text.primary,
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
        attributionLogo: false,
        textColor,
      },
      grid: {
        horzLines: {
          color: theme.palette.text.disabled,
          visible: false
        },
        vertLines: {
          color: theme.palette.text.disabled,
          visible: false
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      autoSize: true,
    });
    chart.timeScale().fitContent();


    // Setting the border color for the horizontal axis
    chart.timeScale().applyOptions({
      borderColor: "white",
    });

    const newSeries = chart.addCandlestickSeries({
        
      upColor: "#13b721",
      downColor: "#FF2142",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });
    newSeries.setData(data);

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);

      chart.remove();
    };
  }, [data, backgroundColor, lineColor, textColor]);

  return <div ref={chartContainerRef} />;
};


export default function CandleStickChart({ data, ...otherProps }) {
  const transformedData = transformData(data);
  return <ChartComponent {...otherProps} data={transformedData} />;
}