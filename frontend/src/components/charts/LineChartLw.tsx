import { ChartDataPoint } from "@/types/chart";
import { formatDate } from "@/utils/dataProcessing";
import { useTheme } from "@mui/material";
import {
  BusinessDay,
  ColorType,
  createChart,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  Time,
  MouseEventParams
} from "lightweight-charts";
import { debounce } from "lodash";
import React, { useEffect, useMemo, useRef } from "react";


interface PerformanceChartProps {
  data: ChartDataPoint[];
  height: number;
}

// <-- MOVED: Define tooltip constants here for component-wide scope
const toolTipWidth = 96;
const toolTipHeight = 80; // Adjusted height for better fit
const toolTipMargin = 15;

const PerformanceChart = ({ data, height }: PerformanceChartProps) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Baseline"> | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  /* ─────────────────────────── % conversion ─────────────────────────── */
  const pctData = useMemo<ChartDataPoint[]>(() => {
    if (!data.length) return [];
    return data.map((p) => ({
      ...p,
      value: p.value * 100,
    }));
  }, [data]);

  /* ───────────────────── init chart (runs once) ───────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: theme.palette.text.primary,
        attributionLogo: false
      },
      grid: { horzLines: { visible: false }, vertLines: { visible: false } },
      crosshair: {
        mode: CrosshairMode.Normal,
        horzLine: { visible: false, labelVisible: false },
        vertLine: {
          labelVisible: false,
          width: 1,
          color: theme.palette.text.secondary,
          style: 2,
        },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        tickMarkFormatter: (t: Time) => {
          const d =
            typeof t === "number"
              ? new Date(t * 1000)
              : typeof t === "string"
              ? new Date(t)
              : new Date((t as BusinessDay).year, (t as BusinessDay).month - 1, (t as BusinessDay).day);
          return `${d.getUTCDate()} ${d.toLocaleString("default", { month: "short" })}`;
        },
      },
      handleScroll: false,
      handleScale: false,
      localization: { priceFormatter: (p: number) => `${p.toFixed(2)} %` },
    });
    chartRef.current = chart;

    const series = chart.addBaselineSeries({
      baseValue: { type: "price", price: 0 },
      topLineColor: "rgba(38,166,154,1)",
      topFillColor1: "rgba(38,166,154,.28)",
      topFillColor2: "rgba(38,166,154,.05)",
      bottomLineColor: "rgba(239,83,80,1)",
      bottomFillColor1: "rgba(239,83,80,.05)",
      bottomFillColor2: "rgba(239,83,80,.28)",
      lastValueVisible: true,
      priceLineVisible: true,
      crosshairMarkerVisible: true,
    });
    seriesRef.current = series;

    /* ─────────────────────────── Tooltip setup ────────────────────────── */
    const toolTip = document.createElement("div");
    toolTip.style.width = `${toolTipWidth}px`;
    // toolTip.style.height = `${toolTipHeight}px`; // Height can be automatic
    toolTip.style.position = "absolute";
    toolTip.style.display = "none";
    toolTip.style.padding = "8px";
    toolTip.style.boxSizing = "border-box";
    toolTip.style.fontSize = "12px";
    toolTip.style.textAlign = "left";
    toolTip.style.zIndex = "1000";
    toolTip.style.top = "12px";
    toolTip.style.left = "12px";
    toolTip.style.pointerEvents = "none";
    toolTip.style.border = `1px solid ${theme.palette.divider}`;
    toolTip.style.borderRadius = "4px";
    toolTip.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";
    toolTip.style.background = theme.palette.background.paper;
    toolTip.style.color = theme.palette.text.primary;
    containerRef.current.appendChild(toolTip);
    tooltipRef.current = toolTip;

    const onResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (chartRef.current) {
        // <-- REMOVED: The incorrect unsubscribe call is gone from here.
        chartRef.current.remove();
        chartRef.current = null;
      }
      if (tooltipRef.current && containerRef.current?.contains(tooltipRef.current)) {
        containerRef.current.removeChild(tooltipRef.current);
        tooltipRef.current = null;
      }
    };
  }, []); // Runs only ONCE

  /* ───────────────────── Update chart options on theme/height change ───────────────────── */
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: { textColor: theme.palette.text.primary },
        crosshair: { vertLine: { color: theme.palette.text.secondary } },
        height,
      });
    }
    if (tooltipRef.current) {
      tooltipRef.current.style.border = `1px solid ${theme.palette.divider}`;
      tooltipRef.current.style.background = theme.palette.background.paper;
      tooltipRef.current.style.color = theme.palette.text.primary;
    }
  }, [theme, height]);

  /* ─────────────────────────── Update data ────────────────────────── */
  useEffect(() => {
    if (seriesRef.current && chartRef.current) {
      seriesRef.current.setData(pctData);
      chartRef.current.timeScale().fitContent();
    }
  }, [pctData]);

  /* ─────────────────────────── Crosshair / Tooltip logic ────────────────────────── */
  useEffect(() => {
    const currentChart = chartRef.current;
    const currentSeries = seriesRef.current;
    const currentTooltip = tooltipRef.current;
    const currentContainer = containerRef.current;

    if (!currentChart || !currentSeries || !currentTooltip || !currentContainer) {
      return;
    }

    const handleCrosshair = debounce((param: MouseEventParams) => {
      if (!param.point || !param.time || !param.seriesData.has(currentSeries)) {
        currentTooltip.style.display = "none";
        return;
      }
      const dataPoint = param.seriesData.get(currentSeries) as ChartDataPoint;
      if (!dataPoint) {
        currentTooltip.style.display = "none";
        return;
      }

      currentTooltip.style.display = "block";
      const price = dataPoint.value;
      const dateStr = formatDate(dataPoint.time);

      currentTooltip.innerHTML = `
        <div style="color: ${theme.palette.text.primary}; font-weight: bold;">Return</div>
        <div style="font-size: 18px; margin: 4px 0px;">
          ${price.toFixed(2)}%
        </div>
        <div style="color: ${theme.palette.text.secondary};">
          ${dateStr}
        </div>
      `;

      const coordinate = currentSeries.priceToCoordinate(price);
      if (coordinate === null) return;

      let shiftedCoordinateX = param.point.x - toolTipWidth / 2;
      shiftedCoordinateX = Math.max(0, Math.min(currentContainer.clientWidth - toolTipWidth, shiftedCoordinateX));

      // Use the actual height of the tooltip for more accurate positioning
      const currentTooltipHeight = currentTooltip.clientHeight;
      let shiftedCoordinateY = coordinate - currentTooltipHeight - toolTipMargin;
      if (shiftedCoordinateY < 0) {
        shiftedCoordinateY = coordinate + toolTipMargin;
      }

      currentTooltip.style.left = shiftedCoordinateX + "px";
      currentTooltip.style.top = shiftedCoordinateY + "px";
    }, 0);

    currentChart.subscribeCrosshairMove(handleCrosshair);

    return () => {
      // Cleanup for THIS effect
      handleCrosshair.cancel(); // Cancel any pending debounced calls
      currentChart.unsubscribeCrosshairMove(handleCrosshair);
    };
  }, [theme]); // Rerun when theme changes to update tooltip colors

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", minWidth: 260, height }}
    />
  );
};

export default React.memo(PerformanceChart);