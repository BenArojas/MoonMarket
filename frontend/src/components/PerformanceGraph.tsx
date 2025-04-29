import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi,  Time, PriceLineOptions, LineStyle, LineWidth, BusinessDay } from 'lightweight-charts';
import { useTheme } from "@mui/material";
import { debounce } from 'lodash';
import { formatCurrency, formatDate } from '@/utils/dataProcessing';
import { ChartDataPoint } from './CurrentStockChart';

interface PerformanceChartProps {
  data: ChartDataPoint[];
}

const PerformanceChart = ({ data }: PerformanceChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
  const [tooltipData, setTooltipData] = useState<{ value: string; time: Time }>({ value: '0', time: '' });
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const memoizedData = useMemo<ChartDataPoint[]>(() => data, [data]);

  const { maxValue, minValue } = useMemo<{ maxValue: number; minValue: number }>(() => ({
    maxValue: Math.max(...memoizedData.map(item => item.value)),
    minValue: Math.min(...memoizedData.map(item => item.value))
  }), [memoizedData]);

  const updateTooltip = useCallback(
    debounce((param, series: ISeriesApi<'Baseline'>) => {
      if (param.point && param.time && param.point.x >= 0 && param.point.y >= 0) {
        const dataPoint = param.seriesData.get(series);
        if (dataPoint) {
          const timestamp = (dataPoint as ChartDataPoint).time; // number (Unix timestamp in seconds)
          setTooltipData({
            value: (dataPoint as ChartDataPoint).value.toFixed(2),
            time: timestamp // Store as number, which is a valid Time type
          });
          setTooltipVisible(true);

          const coordinate = series.priceToCoordinate((dataPoint as ChartDataPoint).value);
          if (coordinate !== null) {
            const shiftedCoordinate = param.point.x - 50;
            setTooltipPosition({ x: shiftedCoordinate, y: coordinate });
          }
        }
      } else {
        setTooltipVisible(false);
      }
    }, 20),
    []
  );

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current!.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: theme.palette.text.primary,
        attributionLogo: false,
      },
      grid: {
        horzLines: { visible: false },
        vertLines: { visible: false },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: theme.palette.text.secondary,
          style: 2,
          labelVisible: false,
        },
        horzLine: {
          visible: false,
          labelVisible: false,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 250,
      handleScroll: false,
      handleScale: false,
      rightPriceScale: {
        scaleMargins: {
          top: 0.35,
          bottom: 0.15,
        },
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        timeVisible: true,
        tickMarkFormatter: (time: Time, tickMarkType: unknown): string => {
            let date: Date;
            if (typeof time === 'number') {
              date = new Date(time * 1000); // Unix timestamp in seconds (UTCTimestamp)
            } else if (typeof time === 'string') {
              date = new Date(time); // Parse string date
            } else {
              // Handle BusinessDay
              const businessDay = time as BusinessDay;
              date = new Date(businessDay.year, businessDay.month - 1, businessDay.day); // month is 1-based
            }
            return `${date.getUTCDate()} ${date.toLocaleString('default', { month: 'short' })}`;
          }
      },
    });

    chart.applyOptions({
      localization: {
        priceFormatter: (price: number): string => `${price.toFixed(2)}%`
      },
    });

    const baselineSeries: ISeriesApi<'Baseline'> = chart.addBaselineSeries({
      baseValue: { type: 'price', price: 0 },
      lastValueVisible: false,
      priceLineVisible: false,
      topLineColor: 'rgba(38, 166, 154, 1)',
      topFillColor1: 'rgba(38, 166, 154, 0.28)',
      topFillColor2: 'rgba(38, 166, 154, 0.05)',
      bottomLineColor: 'rgba(239, 83, 80, 1)',
      bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
      bottomFillColor2: 'rgba(239, 83, 80, 0.28)'
    });

    baselineSeries.setData(memoizedData);

    const zeroLine: Partial<PriceLineOptions> = {
      price: 0,
      color: theme.palette.text.primary,
      lineWidth: 1 as LineWidth,
      lineStyle: 1 as LineStyle,
    };

    baselineSeries.createPriceLine(zeroLine);

    if (maxValue < 0) {
      chart.applyOptions({
        rightPriceScale: {
          scaleMargins: {
            top: 0.55,
            bottom: 0.36,
          },
        },
      });
    }

    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      updateTooltip(param, baselineSeries);
    });

    chartRef.current = chart;

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [memoizedData, theme, maxValue, updateTooltip]);

  return (
    <div
      ref={chartContainerRef}
      style={{
        position: "relative",
        width: "100%",
        height: 250,
        minWidth: "260px"
      }}
    >
      {tooltipVisible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            padding: '4px',
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '4px',
            fontSize: '12px',
            color: theme.palette.text.primary,
            zIndex: 1000,
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transition: 'left 0.1s, top 0.1s',
            pointerEvents: 'none',
          }}
        >
          <div>Value: {tooltipData.value}%</div>
          <div>Date: {formatDate(tooltipData.time)}</div>
        </div>
      )}
    </div>
  );
};

export default React.memo(PerformanceChart);