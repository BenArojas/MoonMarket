import { createChart, ColorType } from "lightweight-charts";
import React, { useEffect, useRef } from "react";
import { useTheme } from "@mui/material";
import { BrushableAreaSeries } from "@/plugins/brushable-area-series/brushable-area-series";
import { DeltaTooltipPrimitive } from "@/plugins/delta-tooltip/delta-tooltip";
import { TooltipPrimitive } from "@/plugins/tooltip/tooltip";

export const CurrentStockChart = (props) => {
  const theme = useTheme();

  const {
    data,
    enableAdvancedFeatures = false,
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
      handleScroll: !enableAdvancedFeatures,
      handleScale: !enableAdvancedFeatures,
      rightPriceScale: {
        borderColor: "transparent",
      },
    });

    const greenStyle = {
      lineColor: "rgb(4,153,129)",
      topColor: "rgba(4,153,129, 0.4)",
      bottomColor: "rgba(4,153,129, 0)",
      lineWidth: 3,
    };

    const redStyle = {
      lineColor: "rgb(239,83,80)",
      topColor: "rgba(239,83,80, 0.4)",
      bottomColor: "rgba(239,83,80, 0)",
      lineWidth: 3,
    };

    const fadeStyle = {
      lineColor: "rgb(40,98,255, 0.2)",
      topColor: "rgba(40,98,255, 0.05)",
      bottomColor: "rgba(40,98,255, 0)",
    };

    const baseStyle = {
      lineColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
    };

    chart.timeScale().fitContent();
    chart.timeScale().applyOptions({
      borderColor: "white",
    });

    let series;
    if (enableAdvancedFeatures) {
      const brushableAreaSeries = new BrushableAreaSeries({
        lineColor: theme.palette.primary.main,
        topColor: theme.palette.primary.main,
        bottomColor: "transparent",
      });

      series = chart.addCustomSeries(brushableAreaSeries, {
        priceLineVisible: false,
      });
      series.applyOptions({
        color: theme.palette.primary.main,
        lineColor: theme.palette.primary.main,
        topColor: theme.palette.primary.main,
        bottomColor: "transparent",
        lineWidth: 2,
      });

      const tooltipPrimitive = new DeltaTooltipPrimitive({
        lineColor,
      });
      series.attachPrimitive(tooltipPrimitive);

      tooltipPrimitive.activeRange().subscribe((activeRange) => {
        if (activeRange === null) {
          series.applyOptions({
            brushRanges: [],
            ...baseStyle,
          });
          return;
        }
        series.applyOptions({
          brushRanges: [
            {
              range: {
                from: activeRange.from,
                to: activeRange.to,
              },
              style: activeRange.positive ? greenStyle : redStyle,
            },
          ],
          ...fadeStyle,
        });
      });
    } else {
      series = chart.addAreaSeries();
      series.applyOptions({...baseStyle,
        lineType: 2,
        priceLineVisible: false,})

      const tooltipPrimitive = new TooltipPrimitive();
      series.attachPrimitive(tooltipPrimitive);
    }

    series.setData(data);

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [
    data,
    enableAdvancedFeatures,
    backgroundColor,
    lineColor,
    textColor,
    areaTopColor,
    areaBottomColor,
    theme,
  ]);

  return (
    <div
      ref={chartContainerRef}
      style={{ position: "relative", width: "100%", height: "250px" }}
    />
  );
};
