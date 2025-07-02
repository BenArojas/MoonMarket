// components/charts/MonthlyBarChartLW.tsx
import {
    createChart,
    ColorType,
    HistogramData,
    IChartApi,
    ISeriesApi,
    Time,
  } from 'lightweight-charts';
  import { useEffect, useRef } from 'react';
  import { useTheme } from '@mui/material';
  import { toSeries } from '@/utils/lwHelpers';
  
  interface Props {
    dates: string[];
    values: number[];
    height?: number;
  }
  
  export default function MonthlyBarChartLW({
    dates,
    values,
    height = 240,
  }: Props) {
    const theme = useTheme();
    const wrap = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi>();
    const seriesRef = useRef<ISeriesApi<'Histogram'>>();
  
    useEffect(() => {
      if (!wrap.current) return;
  
      const chart = createChart(wrap.current, {
        width: wrap.current.clientWidth,
        height,
        layout: { background: { type: ColorType.Solid, color: 'transparent' },
                  textColor: theme.palette.text.primary,
                  attributionLogo: false },
        grid: { horzLines: { visible: false }, vertLines: { visible: false } },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
        handleScroll: false,
        handleScale: false,
        localization: { priceFormatter: p => `${(p*100).toFixed(2)} %` },
      });
  
      const series = chart.addHistogramSeries({
        priceLineVisible: false,
        base: 0,
        color: theme.palette.grey[500],
      });
  
      chartRef.current = chart;
      seriesRef.current = series;
  
      return () => chart.remove();
    }, [theme, height]);
  
    /* push data any time arrays change */
    useEffect(() => {
      if (!seriesRef.current) return;
  
      const histo: HistogramData<Time>[] = toSeries(dates, values).map(p => ({
        ...p,
        color: p.value >= 0 ? theme.palette.success.main : theme.palette.error.main,
      }));
  
      seriesRef.current.setData(histo);
    }, [dates, values, theme]);
  
    return <div ref={wrap} style={{ width: '100%', minWidth: 260, height }} />;
  }
  