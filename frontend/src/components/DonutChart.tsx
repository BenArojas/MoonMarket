import "@/styles/donut-chart.css";
import { DonutData } from "@/utils/dataProcessing";
import { Box, Button, useMediaQuery, useTheme } from "@mui/material";
import * as d3 from "d3";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

const MARGIN_X = 100;
const MARGIN_Y = 50;
const INFLEXION_PADDING = 25;

// Enhanced color array with more vibrant base colors
const colors_array = [
  "hsla(163, 70%, 85%, 0.9)",
  "hsla(163, 65%, 80%, 0.9)",
  "hsla(163, 60%, 70%, 0.9)",
  "hsla(163, 55%, 76%, 0.9)",
  "hsla(163, 50%, 66%, 0.9)",
  "hsla(163, 45%, 56%, 0.9)",
  "hsla(163, 40%, 46%, 0.9)",
  "hsla(163, 35%, 40%, 0.9)",
  "hsla(163, 30%, 35%, 0.9)",
];

const colors: string[] = colors_array.sort(() => 0.5 - Math.random()).slice(0, 9);

interface DonutChartProps {
  width: number;
  height: number;
  data: DonutData;
}

export const DonutChart = ({ width, height, data }: DonutChartProps) => {
  const [showOthers, setShowOthers] = useState<boolean>(false);
  const ref = useRef<SVGGElement>(null);
  const theme = useTheme();
  const isMobileScreen: boolean = useMediaQuery(theme.breakpoints.down("sm"));

  // Calculate chart size and margins for mobile
  const radius: number = Math.min(width - 2 * MARGIN_X, height - 2 * MARGIN_Y) / 2.2; // Increased the size by decreasing the factor
  const innerRadius: number = radius / 2.5; // Increased inner radius to make the donut more prominent
  const verticalOffset: number = 18;

  // Type for chart data, assuming DonutData has an othersStocks property
  interface ChartData extends DonutData {
    othersStocks?: any;
    name: string;
    value: number;
    percentageOfPortfolio: number;
  }

  const chartData: ChartData[] = useMemo(() => {
    return showOthers && data.othersStocks ? data.othersStocks : data;
  }, [data, showOthers]);

  const pie: d3.PieArcDatum<ChartData>[] = useMemo(() => {
    const pieGenerator = d3
      .pie<ChartData>()
      .value((d: ChartData) => d.value);
    return pieGenerator(chartData);
  }, [chartData]);

  const arcGenerator: d3.Arc<any, d3.PieArcDatum<ChartData>> = d3.arc();

  const shapes: JSX.Element[] = pie.map((grp, i) => {
    const sliceInfo = {
      innerRadius,
      outerRadius: radius,
      startAngle: grp.startAngle,
      endAngle: grp.endAngle,
    };
    const centroid: [number, number] = arcGenerator.centroid(sliceInfo);
    const slicePath: string | null = arcGenerator(sliceInfo);

    const inflexionInfo = {
      innerRadius: radius + INFLEXION_PADDING,
      outerRadius: radius + INFLEXION_PADDING,
      startAngle: grp.startAngle,
      endAngle: grp.endAngle,
    };
    const inflexionPoint: [number, number] = arcGenerator.centroid(inflexionInfo);

    const isRightLabel: boolean = inflexionPoint[0] > 0;
    const labelPosX: number = inflexionPoint[0] + 50 * (isRightLabel ? 1 : -1);
    const textAnchor: string = isRightLabel ? "start" : "end";
    const ticker: string = grp.data.name;
    const label: string = `${ticker} (${grp.value.toLocaleString("en-US")}$)`;
    const percentageOfPortfolio: number = grp.data.percentageOfPortfolio;

    // Scale font size for mobile screens
    const fontSize: number = isMobileScreen ? 10 : 14;

    return (
      <Link
        key={grp.data.name}
        to={{
          search: grp.data.name === "Others" ? "" : `selected=${ticker}`,
        }}
        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
          if (grp.data.name === "Others") e.preventDefault();
        }}
      >
        <defs>
          {colors.map((color, idx) => (
            <radialGradient
              key={idx}
              id={`holographic-gradient-${idx}`}
              gradientUnits="userSpaceOnUse"
              cx="0"
              cy="0"
              r={radius}
            >
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color} />
            </radialGradient>
          ))}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g
          key={i}
          className="slice"
          onClick={() => setShowOthers(grp.data.name === "Others")}
          onMouseEnter={() => {
            if (ref.current) {
              ref.current.classList.add("hasHighlight");
            }
          }}
          onMouseLeave={() => {
            if (ref.current) {
              ref.current.classList.remove("hasHighlight");
            }
          }}
        >
          <path
            d={slicePath || ""}
            fill={`url(#holographic-gradient-${i % colors.length})`}
            filter="url(#glow)"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
          />
          <line
            x1={centroid[0]}
            y1={centroid[1]}
            x2={inflexionPoint[0]}
            y2={inflexionPoint[1]}
            stroke={theme.palette.text.primary}
            strokeWidth="1"
          />
          <line
            x1={inflexionPoint[0]}
            y1={inflexionPoint[1]}
            x2={labelPosX}
            y2={inflexionPoint[1]}
            stroke={theme.palette.text.primary}
            strokeWidth="1"
          />
          <text
            x={labelPosX + (isRightLabel ? 2 : -2)}
            y={inflexionPoint[1]}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            fontSize={fontSize}
            fill={theme.palette.text.primary}
          >
            {label}
          </text>
          <text
            x={labelPosX + (isRightLabel ? 2 : -2)}
            y={inflexionPoint[1] + verticalOffset}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            fontSize={fontSize}
            fill={theme.palette.text.primary}
          >
            {percentageOfPortfolio}%
          </text>
        </g>
      </Link>
    );
  });

  return (
    <Box sx={{ position: "relative" }}>
      {showOthers && (
        <Button
          onClick={() => setShowOthers(false)}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          Back to Main View
        </Button>
      )}
      <svg width={width} height={height} style={{ display: "inline-block" }}>
        <g
          transform={`translate(${width / 2}, ${height / 2})`}
          className="container"
          ref={ref}
        >
          {shapes}
        </g>
      </svg>
    </Box>
  );
};

export default DonutChart;