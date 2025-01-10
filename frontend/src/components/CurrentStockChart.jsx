import { createChart, ColorType } from "lightweight-charts";
import React, { useEffect, useRef } from "react";
import { useTheme } from "@mui/material";
import { BrushableAreaSeries } from "@/plugins/brushable-area-series/brushable-area-series";
import { DeltaTooltipPrimitive } from "@/plugins/delta-tooltip/delta-tooltip";
import { TooltipPrimitive } from "@/plugins/tooltip/tooltip";
import {formatCurrency} from '@/utils/dataProcessing'

export const AreaChart = (props) => {
  const theme = useTheme();

  const {
    data,
    trend,
    enableAdvancedFeatures = false,
    height,
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


    const fadeStyle = {
      lineColor: "rgb(40,98,255, 0.2)",
      topColor: "rgba(40,98,255, 0.05)",
      bottomColor: "rgba(40,98,255, 0)",
    };

    const positiveStyle = {
      color: theme.palette.primary.main,
      lineColor: theme.palette.primary.main,
      topColor: theme.palette.primary.main,
      bottomColor: "transparent",
    };

    const negativeStyle = {
      color: 'red',
      lineColor: 'red',
      topColor: 'red',
      bottomColor: "transparent",
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
      const style = trend === 'positive' ? positiveStyle : negativeStyle;
      chart.timeScale().applyOptions({
        borderVisible: false,
            fixLeftEdge: true,
            fixRightEdge: true,
            timeVisible: true, // Enables full dates
            tickMarkFormatter: (time, tickMarkType) => {
                const date = new Date(time * 1000);
                return `${date.getUTCDate()} ${date.toLocaleString('default', { month: 'short' })}`;
            }
      });
      const brushableAreaSeries = new BrushableAreaSeries(style);

      series = chart.addCustomSeries(brushableAreaSeries, {
        priceLineVisible: false,
      });
      series.applyOptions({
        ...style,
        lineWidth: 2,
      });

      const tooltipPrimitive = new DeltaTooltipPrimitive({
        lineColor: style.lineColor,
      });
      series.attachPrimitive(tooltipPrimitive);

      tooltipPrimitive.activeRange().subscribe((activeRange) => {
        if (activeRange === null) {
          series.applyOptions({
            brushRanges: [],
            ...(trend === 'positive' ? positiveStyle : negativeStyle),
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
              style: activeRange.positive ? positiveStyle : negativeStyle,
            },
          ],
          ...(trend === 'positive' ? fadeStyle : {
            lineColor: "rgba(239,83,80, 0.2)",
            topColor: "rgba(239,83,80, 0.05)",
            bottomColor: "rgba(239,83,80, 0)",
          }),
        });
      });
    } else {
      series = chart.addAreaSeries();
      series.applyOptions({
        ...baseStyle,
        lineType: 2,
        priceLineVisible: false,
      })

      const tooltipPrimitive = new TooltipPrimitive({
        priceExtractor: (dataPoint) => formatCurrency(dataPoint.value), // Apply formatCurrency here
      });
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
      style={{ position: "relative", minWidth: "260px", height: height }}
    />
  );
};
