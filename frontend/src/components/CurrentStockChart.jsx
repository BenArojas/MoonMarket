import { createChart, ColorType } from "lightweight-charts";
import React, { useEffect, useRef } from "react";
import { useTheme } from "@mui/material";

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
      lineType: 2,
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
