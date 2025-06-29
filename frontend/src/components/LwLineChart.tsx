import React, { useRef, useEffect, useMemo, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  Time,
  BusinessDay,
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
  const [tip, setTip] = useState<{
    v: string;
    t: Time;
    x: number;
    y: number;
  }>();

  console.log("baseline data is ", data);

  /* ─────────────────────────── % conversion ─────────────────────────── */
  const pctData = useMemo<ChartDataPoint[]>(() => {
    if (!data.length) return [];

    // The incoming data's `value` is already the cumulative return as a decimal (e.g., 0.0639 for 6.39%).
    // We just need to multiply by 100 to get the percentage value for the chart axis.
    // The `baseline` prop is not needed for this calculation.
    return data.map((p) => ({
      ...p,
      value: p.value * 100,
    }));
  }, [data]); // The only dependency needed is `data`

  /* ───────────────────── init chart (runs once) ───────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
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
        vertLine: { width: 1, color: theme.palette.text.secondary, style: 2 },
        horzLine: { visible: false },
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
      localization: { priceFormatter: (p) => `${p.toFixed(2)} %` },
    });

    const series = chart.addBaselineSeries({
      baseValue: { type: "price", price: 0 },
      topLineColor: "rgba(38,166,154,1)",
      topFillColor1: "rgba(38,166,154,.28)",
      topFillColor2: "rgba(38,166,154,.05)",
      bottomLineColor: "rgba(239,83,80,1)",
      bottomFillColor1: "rgba(239,83,80,.05)",
      bottomFillColor2: "rgba(239,83,80,.28)",
      lastValueVisible: false,
      priceLineVisible: false,
    });

    /* tooltip */
    const handleCrosshair = debounce((param) => {
      if (!param.point || !param.time) return setTip(undefined);
      const dp = param.seriesData.get(series) as ChartDataPoint | undefined;
      if (!dp) return setTip(undefined);

      const coord = series.priceToCoordinate(dp.value);
      if (coord == null) return setTip(undefined);

      setTip({
        v: dp.value.toFixed(2),
        t: dp.time,
        x: param.point.x - 50,
        y: coord,
      });
    }, 25);

    chart.subscribeCrosshairMove(handleCrosshair);

    /* resize */
    const onResize = () =>
      chart.applyOptions({ width: containerRef.current!.clientWidth });
    window.addEventListener("resize", onResize);

    /* store refs & cleanup */
    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      window.removeEventListener("resize", onResize);
      chart.unsubscribeCrosshairMove(handleCrosshair);
      chart.remove();
    };
  }, [theme, height]);

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
      {tip && (
        <div
          style={{
            position: "absolute",
            left: tip.x,
            top: tip.y,
            padding: "4px",
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 4,
            fontSize: 12,
            background: theme.palette.background.paper,
            color: theme.palette.text.primary,
            pointerEvents: "none",
            zIndex: 1000,
          }}
        >
          <div>Return: {tip.v}%</div>
          <div>Date&nbsp;&nbsp;: {formatDate(tip.t)}</div>
        </div>
      )}
    </div>
  );
};

export default React.memo(PerformanceChart);
