import { createChart, ColorType, CrosshairMode } from "lightweight-charts";
import React, { useEffect, useRef } from "react";
import { useTheme } from "@mui/material";

function transformData(historicalData) {
  return historicalData.map(item => ({
    time: new Date(item.date).getTime() / 1000,
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: item.volume
  })).sort((a, b) => a.time - b.time);
}


export const ChartComponent = (props) => {
  const theme = useTheme();
  const {
    data,
    isMobile,
    colors: {
      backgroundColor = "transparent",
      lineColor = "#2962FF",
      textColor = theme.palette.text.primary,
      volumeUpColor = "rgba(19, 183, 33, 0.5)",
      volumeDownColor = "rgba(255, 33, 66, 0.5)",
    } = {},
  } = props;

  const chartContainerRef = useRef();

  useEffect(() => {
    const handleResize = () => {
      chart.applyOptions({ width: isMobile ? 350: chartContainerRef.current.clientWidth , height: isMobile ? 300 : 500, });
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
      width: isMobile ? 350: chartContainerRef.current.clientWidth,
      height: isMobile ? 300 : 500,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });
    chart.timeScale().fitContent();

    chart.timeScale().applyOptions({
      borderColor: "white",
      timeVisible: true,
      secondsVisible: false,
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#13b721",
      downColor: "#FF2142",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    candlestickSeries.setData(data);

    // Add volume histogram series
    const volumeSeries = chart.addHistogramSeries({
      color: "#26a69a",
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: "", // Set as overlay
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
    });

    // Set volume data
    const volumeData = data.map(item => ({
      time: item.time,
      value: item.volume,
      color: item.close > item.open ? volumeUpColor : volumeDownColor,
    }));
    volumeSeries.setData(volumeData);

    // Adjust main series scale
    candlestickSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.4,
      },
    });

    // Customize time scale (lower) tooltip
    chart.applyOptions({
      localization: {
        timeFormatter: (time) => {
          const date = new Date(time * 1000);
          return date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
        },
      },
      crosshair: {
        horzLine: {
          visible: true,
          labelVisible: true,
        },
        vertLine: {
          visible: true,
          labelVisible: true,
        },
      },
    });

    // Subscribe to crosshair move to update price line
    chart.subscribeCrosshairMove((param) => {
      if (param.point) {
        const price = param.seriesPrices.get(candlestickSeries);
        if (price !== undefined) {
          priceLine.price = price;
          candlestickSeries.updatePriceLine(priceLine);
        }
      }
    });

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, backgroundColor, lineColor, textColor, volumeUpColor, volumeDownColor, isMobile]);

  return <div ref={chartContainerRef} />;
};

export default function CandleStickChart({ data, ...otherProps }) {
  const transformedData = transformData(data);
  return <ChartComponent {...otherProps} data={transformedData} />;
}