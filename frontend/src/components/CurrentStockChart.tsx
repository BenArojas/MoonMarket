import {
  createChart,
  ColorType,
  IChartApi,            // Type for the chart instance
  ISeriesApi,           // Generic series type
  Time,                 // Type for time (string | Timestamp | BusinessDay)
  TickMarkType,         // Type for tick mark kind
  AreaSeriesPartialOptions, // Type for area series options
} from "lightweight-charts";
import { useEffect, useRef, FC } from "react"; // Import FC for functional component type
import { useTheme } from "@mui/material";

// Assuming these are the correct paths and exports
import { BrushableAreaSeries } from "@/plugins/brushable-area-series/brushable-area-series"; // Assuming BrushStyle is exported
import { DeltaTooltipPrimitive } from "@/plugins/delta-tooltip/delta-tooltip"; // Assuming ActiveRangeData is exported
import { TooltipPrimitive } from "@/plugins/tooltip/tooltip";
import { formatCurrency } from '@/utils/dataProcessing';

// Define the structure of a single data point for the chart
// Using WhitespaceData is idiomatic for lightweight-charts
// It requires 'time' and allows other properties like 'value'
export type ChartDataPoint = {
  time: Time;
  value: number
}

// Define the structure for the optional colors prop
interface ChartColors {
  backgroundColor?: string;
  lineColor?: string;
  textColor?: string;
  areaTopColor?: string;
  areaBottomColor?: string;
}

// Define the props for the AreaChart component
interface AreaChartProps {
  data: ChartDataPoint[];
  trend?: 'positive' | 'negative'; // Only relevant for advanced features
  enableAdvancedFeatures?: boolean;
  height: number | string; // Allow string for heights like '100%'
  colors?: ChartColors;
}

// Define the structure for the styles used internally
// Partial<AreaSeriesPartialOptions> covers most, but add custom ones if needed
// For BrushableAreaSeries, check if it uses standard options or needs its own type
interface SeriesStyleOptions extends Partial<AreaSeriesPartialOptions> {
    color?: string; // Add color if used by DeltaTooltipPrimitive or custom styles
    // Add other custom style props if needed by plugins
}

// --- Custom Plugin Type Placeholders (Replace if actual types are available) ---

// Placeholder for the options expected by BrushableAreaSeries
interface BrushableAreaSeriesOptions extends SeriesStyleOptions {
    brushRanges?: {
        range: { from: Time; to: Time };
        style: any; 
    }[];
}


// --- End Custom Plugin Placeholders ---

export const AreaChart: FC<AreaChartProps> = (props) => {
  const theme = useTheme();

  // Destructure props with defaults, types are inferred from AreaChartProps
  const {
    data,
    trend, // trend can be undefined if enableAdvancedFeatures is false
    enableAdvancedFeatures = false,
    height,
    colors: {
      backgroundColor = "transparent",
      lineColor = theme.palette.primary.main,
      textColor = theme.palette.text.primary,
      areaTopColor = theme.palette.primary.main,
      areaBottomColor = "transparent",
    } = {}, // Default empty object for colors if not provided
  } = props;

  // Type the ref for the container element
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  // Ref to store the chart instance for cleanup/resize
  const chartRef = useRef<IChartApi | null>(null);
   // Ref to store the series instance
  const seriesRef = useRef<IAreaSeriesApi<Time> | ISeriesApi<'Custom'> | null>(null);


  useEffect(() => {
    // Ensure the container ref is available
    if (!chartContainerRef.current) {
      console.error("Chart container ref not available");
      return;
    }
    const container = chartContainerRef.current;

    const handleResize = () => {
      // Use the chart instance from the ref
      if (chartRef.current) {
         chartRef.current.applyOptions({ width: container.clientWidth });
      }
    };

    // Type the chart instance
    const chart: IChartApi = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
        attributionLogo: false, // Explicitly set if needed
      },
      grid: {
        horzLines: {
          color: theme.palette.text.disabled, // Use theme color
          visible: false, // Keep grid lines off as per original code
        },
        vertLines: {
          color: theme.palette.text.disabled, // Use theme color
          visible: false,
        },
      },
      width: container.clientWidth,
      height: typeof height === 'number' ? height : 300, // Use provided height, fallback needed if string like '100%'
      handleScroll: !enableAdvancedFeatures,
      handleScale: !enableAdvancedFeatures,
      rightPriceScale: {
        borderColor: "transparent", // As per original code
        // Consider adding scaleMargins if needed
        // scaleMargins: { top: 0.2, bottom: 0.1 },
      },
      timeScale: {
         borderColor: theme.palette.divider, // Use theme color, was "white"
         borderVisible: false, // Keep border off?
         timeVisible: enableAdvancedFeatures, // Only show detailed time for advanced
         secondsVisible: false,
         // fixLeftEdge/fixRightEdge moved to applyOptions where needed
      }
    });
    chartRef.current = chart; // Store chart instance

    // Define styles with the SeriesStyleOptions type
    const fadeStyle: SeriesStyleOptions = {
      lineColor: "rgba(40, 98, 255, 0.2)", // Example fade color
      topColor: "rgba(40, 98, 255, 0.05)",
      bottomColor: "rgba(40, 98, 255, 0)",
      lineWidth: 2, // Ensure consistent line width
    };

    const positiveStyle = { // Use specific type from plugin if available
      color: theme.palette.primary.main, // Assuming color is used by tooltip/brush
      lineColor: theme.palette.primary.main,
      topColor: theme.palette.primary.main, // Or a slightly transparent version
      bottomColor: "rgba(0, 150, 136, 0.05)", // Example light green
      lineWidth: 2,
    };

    const negativeStyle = { // Use specific type from plugin if available
      color: theme.palette.error.main, // Use theme error color
      lineColor: theme.palette.error.main,
      topColor: theme.palette.error.main, // Or a slightly transparent version
      bottomColor: "rgba(239, 83, 80, 0.05)", // Example light red
      lineWidth: 2,
    };

    const baseStyle: AreaSeriesPartialOptions = { // Standard options for basic series
      lineColor: lineColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
      lineWidth: 2, // Define base line width
    };

    chart.timeScale().fitContent(); // Fit content initially

    // Declare series variable with the union type
    let currentSeries: IAreaSeriesApi<Time> | ISeriesApi<'Custom'>;

    if (enableAdvancedFeatures) {
      // Determine style based on trend, provide fallback if trend is undefined
      const style = trend === 'positive' ? positiveStyle : negativeStyle;

      chart.timeScale().applyOptions({
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        timeVisible: true, // Ensure time is visible for advanced mode
        tickMarkFormatter: (time: number, tickMarkType: TickMarkType): string => {
          const date = new Date(time * 1000);
          // Example Formatter: Show day and month for major ticks (e.g., start of month)
          // if (tickMarkType === TickMarkType.Year || tickMarkType === TickMarkType.Month) {
             return `${date.getUTCDate()} ${date.toLocaleString('default', { month: 'short' })}`;
          // }
          // return ''; // Return empty for minor ticks if desired
        }
      });

      // Ensure BrushableAreaSeries implements ICustomSeriesPaneView
      const brushableAreaSeries = new BrushableAreaSeries(style);

      // Type the custom series
      currentSeries = chart.addCustomSeries<'Custom'>(brushableAreaSeries, {
        // Add any base options for the custom series here if needed
        priceLineVisible: false, // Common option
        // lastValueVisible: false, // Hide last value label if needed
      });

      // Apply initial style using the specific options type if available
      currentSeries.applyOptions(style as BrushableAreaSeriesOptions); // Cast if needed

      // Ensure DeltaTooltipPrimitive implements ISeriesPrimitive<Time>
      // Type the constructor options
      const tooltipPrimitive = new DeltaTooltipPrimitive({
        lineColor: style.lineColor || 'blue', // Provide fallback color
      });
      currentSeries.attachPrimitive(tooltipPrimitive);

      // Subscribe to active range changes
      tooltipPrimitive.activeRange().subscribe((activeRange: ActiveRangeData | null) => { // Use type from plugin export
        // Type guard for safety, though the check handles it
        const seriesInstance = seriesRef.current as ISeriesApi<'Custom'> | null;
        if (!seriesInstance) return;

        if (activeRange === null) {
          seriesInstance.applyOptions({
            brushRanges: [], // Clear brush ranges
            // Re-apply base style for the trend
            ...(trend === 'positive' ? positiveStyle : negativeStyle),
          } as BrushableAreaSeriesOptions); // Cast if needed
          return;
        }

        // Determine the style for the brushed range
        const brushRangeStyle = activeRange.positive ? positiveStyle : negativeStyle;

        seriesInstance.applyOptions({
          brushRanges: [
            {
              range: {
                from: activeRange.from,
                to: activeRange.to,
              },
              style: brushRangeStyle, // Apply the determined style
            },
          ],
          // Apply fade style to the non-brushed part
          ...(trend === 'positive' ? fadeStyle : { // Define negative fade explicitly
                lineColor: "rgba(239, 83, 80, 0.2)",
                topColor: "rgba(239, 83, 80, 0.05)",
                bottomColor: "rgba(239, 83, 80, 0)",
                lineWidth: 2,
             }
          ),
        } as BrushableAreaSeriesOptions); // Cast if needed
      });

    } else {
      // Type the standard area series
      currentSeries = chart.addAreaSeries(baseStyle);
      // Apply specific options for the basic mode
      currentSeries.applyOptions({
        // lineType: LineType.Curved, // Example: Use LineType enum for curves
        priceLineVisible: false,
        // lastValueVisible: true, // Show last value label?
      });

       // Ensure TooltipPrimitive implements ISeriesPrimitive<Time>
       // Type the constructor options
      const tooltipPrimitive = new TooltipPrimitive({
        // Type the dataPoint argument here
        priceExtractor: (dataPoint: ChartDataPoint | null) => {
            if (!dataPoint || dataPoint.value === undefined) return ""; // Handle null/undefined value
            return formatCurrency(dataPoint.value); // Apply formatCurrency
        }
      });
      currentSeries.attachPrimitive(tooltipPrimitive);
    }

    seriesRef.current = currentSeries; // Store series instance
    // Set data on the series (should match ChartDataPoint[] / WhitespaceData<Time>[])
    currentSeries.setData(data);

    window.addEventListener("resize", handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
      }
       seriesRef.current = null; // Clear series ref
    };
    // Add theme as dependency if its change should re-create the chart
    // Add 'trend' if its change requires full re-render (depends on plugin logic)
  }, [
    data,
    enableAdvancedFeatures,
    trend, // Added trend
    backgroundColor,
    lineColor,
    textColor,
    areaTopColor,
    areaBottomColor,
    height, // Added height
    theme, // Added theme
  ]);

  // Render the container div
  return (
    <div
      ref={chartContainerRef}
      style={{ position: "relative", minWidth: "260px", height: height }} // Use height prop
    />
  );
};