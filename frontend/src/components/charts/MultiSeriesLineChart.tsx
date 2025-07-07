// components/charts/MultiSeriesLineChart.tsx

import { useTheme } from "@mui/material";
import {
    ColorType,
    createChart,
    CrosshairMode,
    IChartApi,
    LineSeriesPartialOptions,
    Time
} from "lightweight-charts";
import { FC, useEffect, useRef } from "react";

export type ChartDataPoint = {
    time: Time;
    value: number;
};

export interface SeriesData {
    data: ChartDataPoint[];
    options: LineSeriesPartialOptions;
}

interface MultiSeriesLineChartProps {
    series: SeriesData[];
    height: number;
    priceFormatter?: (price: number) => string;
}

export const MultiSeriesLineChart: FC<MultiSeriesLineChartProps> = ({
    series,
    height,
    priceFormatter,
}) => {
    const theme = useTheme();
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;
        const container = chartContainerRef.current;

        const handleResize = () => {
            if (chartRef.current) {
                chartRef.current.applyOptions({ width: container.clientWidth });
            }
        };

        const chart = createChart(container, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: theme.palette.text.secondary,
                attributionLogo: false
            },
            grid: {
                horzLines: { color: theme.palette.divider },
                vertLines: { color: 'transparent' },
            },
            width: container.clientWidth,
            height,
            rightPriceScale: {
                borderColor: "transparent",
            },
            timeScale: {
                borderColor: "transparent",
                timeVisible: true,
                secondsVisible: false,
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                horzLine: {
                    visible: true,
                    labelVisible: true,
                },
            },
            // Add a legend to the chart itself
            legend: {
                visible: true,
                textColor: theme.palette.text.primary,
            },
        });
        chartRef.current = chart;

        // Add each series to the chart
        series.forEach(s => {
            const lineSeries = chart.addLineSeries(s.options);
            lineSeries.setData(s.data);
        });

        // Apply a custom price formatter for the y-axis and tooltip
        if (priceFormatter) {
            chart.applyOptions({
                rightPriceScale: {
                    scaleMargins: { top: 0.1, bottom: 0.1 },
                    formatter: priceFormatter,
                },
                localization: {
                    priceFormatter,
                },
            });
        }

        chart.timeScale().fitContent();
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [series, height, theme, priceFormatter]); // Rerun effect if series data changes

    return <div ref={chartContainerRef} style={{ width: "100%", height }} />;
};