import React, { useRef, useEffect, useMemo } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  Time,
  BusinessDay,
  ChartOptions,
  DeepPartial,
} from "lightweight-charts";
import { useTheme } from "@mui/material";
import { debounce } from "lodash";
import { formatDate } from "@/utils/dataProcessing";

export interface ChartDataPoint {
  time: Time;
  value: number;
}

interface PerformanceChartProps {
  data: ChartDataPoint[];
  height: number;
}

const PerformanceChart = ({ data, height }: PerformanceChartProps) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi>();
  const seriesRef = useRef<ISeriesApi<"Baseline">>();
  const tooltipRef = useRef<HTMLDivElement>();

  /* ─────────────────────────── % conversion ─────────────────────────── */
  const pctData = useMemo<ChartDataPoint[]>(() => {
    if (!data.length) return [];

    // The incoming data's `value` is already the cumulative return as a decimal (e.g., 0.0639 for 6.39%).
    // We just need to multiply by 100 to get the percentage value for the chart axis.
    return data.map((p) => ({
      ...p,
      value: p.value * 100,
    }));
  }, [data]);

  /* ───────────────────── init chart (runs once) ───────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;

    const chartOptions: DeepPartial<ChartOptions> = {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: theme.palette.text.primary,
        attributionLogo: false,
      },
      grid: { horzLines: { visible: false }, vertLines: { visible: false } },
      crosshair: {
        mode: CrosshairMode.Normal,
        // Hide the crosshair lines and labels
        horzLine: {
          visible: false,
          labelVisible: false,
        },
        vertLine: {
          // Keep the vertical line, but hide its label
          labelVisible: false,
          width: 1,
          color: theme.palette.text.secondary,
          style: 2,
        },
      },
      rightPriceScale: { borderVisible: false},
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        tickMarkFormatter: (t: Time) => {
          const d =
            typeof t === "number"
              ? new Date(t * 1000)
              : typeof t === "string"
              ? new Date(t)
              : new Date(
                  (t as BusinessDay).year,
                  (t as BusinessDay).month - 1,
                  (t as BusinessDay).day
                );
          return `${d.getUTCDate()} ${d.toLocaleString("default", {
            month: "short",
          })}`;
        },
      },
      handleScroll: false,
      handleScale: false,
      localization: { priceFormatter: (p: number) => `${p.toFixed(2)} %` },
    };

    const chart = createChart(containerRef.current, chartOptions);
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

    /* ─────────────────────────── Tooltip ────────────────────────── */
    const toolTip = document.createElement("div");
    const toolTipWidth = 96;
    const toolTipHeight = 96;
    const toolTipMargin = 15;
    toolTip.style.width = `${toolTipWidth}px`;
    toolTip.style.height = `${toolTipHeight}px`;
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
    toolTip.style.fontFamily =
      "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";
    toolTip.style.background = theme.palette.trinary.main;
    toolTip.style.color = theme.palette.text.primary;
    containerRef.current.appendChild(toolTip);
    tooltipRef.current = toolTip;

    const handleCrosshair = debounce((param) => {
      if (
        !param.point ||
        !param.time ||
        !seriesRef.current ||
        !chartRef.current ||
        !containerRef.current
      ) {
        toolTip.style.display = "none";
        return;
      }
      const data = param.seriesData.get(seriesRef.current) as
        | ChartDataPoint
        | undefined;
      if (!data) {
        toolTip.style.display = "none";
        return;
      }

      toolTip.style.display = "block";
      const price = data.value;
      const dateStr = formatDate(data.time);

      toolTip.innerHTML = `
        <div style="color: ${theme.palette.text.primary}; font-weight: bold;">Return</div>
        <div style="font-size: 18px; margin: 4px 0px;">
          ${price.toFixed(2)}%
        </div>
        <div>
          ${dateStr}
        </div>
      `;

      const coordinate = seriesRef.current.priceToCoordinate(price);
      if (coordinate === null) {
        return;
      }

      let shiftedCoordinate = param.point.x - toolTipWidth / 2;
      shiftedCoordinate = Math.max(
        0,
        Math.min(
          containerRef.current.clientWidth - toolTipWidth,
          shiftedCoordinate
        )
      );

      const coordinateY =
        coordinate - toolTipHeight - toolTipMargin > 0
          ? coordinate - toolTipHeight - toolTipMargin
          : Math.max(
              0,
              Math.min(
                containerRef.current.clientHeight -
                  toolTipHeight -
                  toolTipMargin,
                coordinate + toolTipMargin
              )
            );

      toolTip.style.left = shiftedCoordinate + "px";
      toolTip.style.top = coordinateY + "px";
    }, 0); // Debounce with 0ms to defer execution to the next tick

    chart.subscribeCrosshairMove(handleCrosshair);

    /* resize */
    const onResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", onResize);

    /* cleanup */
    return () => {
      window.removeEventListener("resize", onResize);
      chart.unsubscribeCrosshairMove(handleCrosshair);
      if (tooltipRef.current && containerRef.current?.contains(tooltipRef.current)) {
        containerRef.current.removeChild(tooltipRef.current);
      }
      chart.remove();
    };
  }, [theme, height]); // Only re-run if theme or height changes

  /* ─────────── update data + axis range when pctData changes ────────── */
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;

    seriesRef.current.setData(pctData);

    chartRef.current.timeScale().fitContent();
  }, [pctData]);

  /* ─────────────────────────────────────────────────────────────────── */

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", minWidth: 260, height }}
    >
      {/* Tooltip is now a direct child of this div, managed via refs */}
    </div>
  );
};

export default React.memo(PerformanceChart);