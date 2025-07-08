import { createChart, ColorType, CrosshairMode } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { useTheme } from "@mui/material";

interface HistoricalData {
  close: number;
  date: string;
  high: number;
  low: number;
  open: number;
  volume: number;
}

interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartProps {
  data: ChartData[];
  isMobile?: boolean;
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    volumeUpColor?: string;
    volumeDownColor?: string;
  };
}

function transformData(historicalData: HistoricalData[]): ChartData[] {
  return historicalData
    .map((item) => ({
      time: new Date(item.date).getTime() / 1000,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }))
    .sort((a, b) => a.time - b.time);
}

export const ChartComponent: React.FC<ChartProps> = (props) => {
  const theme = useTheme();
  const {
    data,
    isMobile = false,
    colors: {
      backgroundColor = "transparent",
      lineColor = "#2962FF",
      textColor = theme.palette.text.primary,
      volumeUpColor = "rgba(19, 183, 33, 0.5)",
      volumeDownColor = "rgba(255, 33, 66, 0.5)",
    } = {},
  } = props;

  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: isMobile ? 350 : chartContainerRef.current.clientWidth,
          height: isMobile ? 300 : 500,
        });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        attributionLogo: false,
        textColor,
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
      width: isMobile ? 350 : chartContainerRef.current.clientWidth,
      height: isMobile ? 300 : 500,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });
    chart.timeScale().fitContent();

    chart.timeScale().applyOptions({
      borderColor: "white",
      timeVisible: true,
      secondsVisible: false,
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#13b721",
      downColor: "#FF2142",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });

    candlestickSeries.setData(data);

    const volumeSeries = chart.addHistogramSeries({
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
    });

    const volumeData = data.map((item) => ({
      time: item.time,
      value: item.volume,
      color: item.close > item.open ? volumeUpColor : volumeDownColor,
    }));
    volumeSeries.setData(volumeData);

    candlestickSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.4,
      },
    });

    chart.applyOptions({
      localization: {
        timeFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        },
      },
      crosshair: {
        horzLine: {
          visible: true,
          labelVisible: true,
        },
        vertLine: {
          visible: true,
          labelVisible: true,
        },
      },
    });

    let priceLine: { price: number } = { price: 0 };
    chart.subscribeCrosshairMove((param) => {
      if (param.point) {
        const price = param.seriesPrices.get(candlestickSeries);
        if (price !== undefined) {
          priceLine.price = price as number;
          candlestickSeries.updatePriceLine?.(priceLine);
        }
      }
    });

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, backgroundColor, lineColor, textColor, volumeUpColor, volumeDownColor, isMobile, theme]);

  return <div ref={chartContainerRef} />;
};

interface CandleStickChartProps {
  data: HistoricalData[];
  isMobile?: boolean;
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    volumeUpColor?: string;
    volumeDownColor?: string;
  };
}

export default function CandleStickChart({ data, ...otherProps }: CandleStickChartProps) {
  const transformedData = transformData(data);
  return <ChartComponent {...otherProps} data={transformedData} />;
}