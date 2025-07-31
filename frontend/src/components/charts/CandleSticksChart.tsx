import {

    createChart,
  
    ColorType,
  
    CrosshairMode,
  
    ISeriesApi,
  
    IChartApi,
  
    UTCTimestamp,
  
  } from "lightweight-charts";
  
  import React, { useEffect, useRef } from "react";
  
  import { useTheme, Box, Typography } from "@mui/material";
  
  import { useStockStore } from "@/stores/stockStore";
  
  
  
  // Props no longer include data, as the component is self-sufficient.
  
  interface ChartComponentProps {
  
    isMobile?: boolean;
  
  }
  
  
  
  const ChartComponent: React.FC<ChartComponentProps> = ({ isMobile = false }) => {
  
    const theme = useTheme();
  
    // 1. Get live chart data directly from the Zustand store.
  
    const chartData = useStockStore((state) => state.activeStock.chartData);
  
  
  
    const chartContainerRef = useRef<HTMLDivElement>(null);
  
    // Refs to hold the chart and series instances so they don't get recreated on every render.
  
    const chartRef = useRef<IChartApi | null>(null);
  
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  
  
  
    const backgroundColor = "transparent";
  
    const textColor = theme.palette.text.primary;
  
    const volumeUpColor = "rgba(8, 153, 129, 0.5)";  // Green
  
    const volumeDownColor = "rgba(213, 87, 95, 0.5)"; // Red
  
  
  
    // Effect for creating and cleaning up the chart (runs only once).
  
    useEffect(() => {
  
      if (!chartContainerRef.current) return;
  
  
  
      // 2. Create the chart, but only one time.
  
      const chart = createChart(chartContainerRef.current, {
  
        layout: {
  
          background: { type: ColorType.Solid, color: backgroundColor },
  
          textColor,
  
          attributionLogo: false,
  
        },
  
        grid: {
  
          horzLines: { visible: false },
  
          vertLines: { visible: false },
  
        },
  
        width: chartContainerRef.current.clientWidth,
  
        height: 500, // Fixed height, can be made dynamic
  
        crosshair: { mode: CrosshairMode.Normal },
  
        timeScale: {
  
          borderColor: theme.palette.divider,
  
          timeVisible: true,
  
          secondsVisible: false,
  
        },
  
      });
  
      chartRef.current = chart;
  
  
  
      // 3. Create the series and store them in refs.
  
      candlestickSeriesRef.current = chart.addCandlestickSeries({
  
        upColor: "#089981",
  
        downColor: "#d5575f",
  
        borderVisible: false,
  
        wickUpColor: "#089981",
  
        wickDownColor: "#d5575f",
  
      });
  
  
  
      volumeSeriesRef.current = chart.addHistogramSeries({
  
        priceFormat: { type: "volume" },
  
        priceScaleId: "", // Set to empty string to overlay on the main chart
  
      });
  
      volumeSeriesRef.current.priceScale().applyOptions({
  
        scaleMargins: { top: 0.7, bottom: 0 },
  
      });
  
  
  
      // Handle window resizing
  
      const handleResize = () => {
  
        if (chartContainerRef.current) {
  
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
  
        }
  
      };
  
      window.addEventListener("resize", handleResize);
  
  
  
      // 4. Return a cleanup function to remove the chart and listener on unmount.
  
      return () => {
  
        window.removeEventListener("resize", handleResize);
  
        chart.remove();
  
        chartRef.current = null;
  
      };
  
    }, []); // Empty dependency array ensures this runs only once.
  
  
  
    // Effect for updating the chart with new data (runs whenever chartData changes).
  
    useEffect(() => {
  
      // 5. Check if the series have been created and if there's data.
  
      if (candlestickSeriesRef.current && volumeSeriesRef.current && chartData.length > 0) {
  
        const sortedData = [...chartData].sort((a, b) => a.time - b.time);
  
        // Format data for candlestick series
  
        const candleData = sortedData.map(d => ({
  
          time: d.time as UTCTimestamp,
  
          open: d.open,
  
          high: d.high,
  
          low: d.low,
  
          close: d.close,
  
        }));
  
        candlestickSeriesRef.current.setData(candleData);
  
       
  
        // Format data for volume series
  
        const volumeData = sortedData.map(d => ({
  
          time: d.time as UTCTimestamp,
  
          value: d.volume,
  
          color: d.close > d.open ? volumeUpColor : volumeDownColor,
  
        }));
  
        volumeSeriesRef.current.setData(volumeData);
  
       
  
        // Auto-fit the view to the data
  
        if (chartRef.current) {
  
          chartRef.current.timeScale().fitContent();
  
        }
  
      }
  
    }, [chartData, volumeUpColor, volumeDownColor]); // This effect re-runs only when data changes.
  
  
  
    return <div ref={chartContainerRef} style={{ width: '100%', height: '500px' }} />;
  
  };
  
  
  
  
  
  // This is the clean, exported wrapper component.
  
  function CandleStickChart(props: ChartComponentProps) {
  
    // We can show a loading/empty state until the first batch of data arrives.
  
    const hasData = useStockStore((state) => state.activeStock.chartData.length > 0);
  
   
  
    if (!hasData) {
  
      return (
  
        <Box sx={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  
          <Typography>Loading chart data...</Typography>
  
        </Box>
  
      );
  
    }
  
  
  
    return <ChartComponent {...props} />;
  
  }
  
  
  
  export default React.memo(CandleStickChart);