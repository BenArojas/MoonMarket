import { useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import "@/styles/donut-chart.css";
import { useNavigate, Link } from "react-router-dom";
import { Box, Button } from "@mui/material";
import { useTheme } from "@mui/material";

const MARGIN_X = 150;
const MARGIN_Y = 50;
const INFLEXION_PADDING = 25;

// const colors_array = [
//   "#1a8cff", // Bright blue
//   "#f94144", // Vibrant red
//   "#f3722c", // Deep orange
//   "#f8961e", // Warm yellow
//   "#43aa8b", // Teal green
//   "#577590", // Muted blue
//   "#b5179e", // Magenta
//   "#90be6d", // Soft green
//   "#f9c74f", // Gold
//   "#ff0054", // Bold pink
//   "#3700ff", // Deep blue
//   "#02c39a", // Bright teal
//   "#e63946", // Bold red
//   "#1d3557", // Dark navy
//   "#457b9d", // Muted blue
//   "#f4a261", // Warm orange
//   "#e9c46a", // Golden yellow
//   "#264653", // Deep teal
// ];
// const colors_array = [
//   "hsl(163, 89%, 26%)",
//   "hsl(183, 89%, 26%)",
//   "hsl(203, 89%, 26%)",
//   "hsl(223, 89%, 26%)",
//   "hsl(243, 89%, 26%)",
//   "hsl(263, 89%, 26%)",
//   "hsl(283, 89%, 26%)",
//   "hsl(303, 89%, 26%)",
//   "hsl(323, 89%, 26%)",
//   "hsl(343, 89%, 26%)",
//   "hsl(143, 89%, 26%)",
//   "hsl(123, 89%, 26%)",
//   "hsl(103, 89%, 26%)",
//   "hsl(083, 89%, 26%)",
//   "hsl(063, 89%, 26%)",
// ];
const colors_array = [
  "hsla(163, 70%, 85%, 0.6)",
  "hsla(163, 65%, 80%, 0.6)",
  "hsla(163, 60%, 70%, 0.6)",
  "hsla(163, 55%, 76%, 0.6)",
  "hsla(163, 50%, 66%, 0.6)",
  "hsla(163, 45%, 56%, 0.6)",
  "hsla(163, 40%, 46%, 0.6)",
  "hsla(163, 35%, 40%, 0.6)",
  "hsla(163, 30%, 35%, 0.6)",
  "hsla(163, 25%, 30%, 0.6)",
  "hsla(163, 20%, 20%, 0.6)",
];
// const colors_array = [
//   "hsl(163, 89%, 96%)",
//   "hsl(163, 85%, 86%)",
//   "hsl(163, 81%, 76%)",
//   "hsl(163, 77%, 66%)",
//   "hsl(163, 73%, 56%)",
//   "hsl(163, 69%, 46%)",
//   "hsl(163, 65%, 36%)",
//   "hsl(163, 61%, 26%)",
//   "hsl(163, 57%, 16%)",
//   "hsl(163, 53%, 06%)",
//   "hsl(163, 49%, 26%)",
// ];

// Create a new array of 9 randomized colors from colors_array
const colors = colors_array.sort(() => 0.5 - Math.random()).slice(0, 9);

export const DonutChart = ({ width, height, data }) => {
  const [showOthers, setShowOthers] = useState(false);
  const ref = useRef(null);
  const theme = useTheme();

  const radius = Math.min(width - 2 * MARGIN_X, height - 2 * MARGIN_Y) / 2;
  const innerRadius = radius / 2;
  const verticalOffset = 18;

  const chartData = useMemo(() => {
    return showOthers ? data.othersStocks : data;
  }, [data, showOthers]);

  const pie = useMemo(() => {
    const pieGenerator = d3.pie().value((d) => d.value);
    return pieGenerator(chartData);
  }, [chartData]);

  const arcGenerator = d3.arc();

  const shapes = pie.map((grp, i) => {
    const sliceInfo = {
      innerRadius,
      outerRadius: radius,
      startAngle: grp.startAngle,
      endAngle: grp.endAngle,
    };
    const centroid = arcGenerator.centroid(sliceInfo);
    const slicePath = arcGenerator(sliceInfo);

    const inflexionInfo = {
      innerRadius: radius + INFLEXION_PADDING,
      outerRadius: radius + INFLEXION_PADDING,
      startAngle: grp.startAngle,
      endAngle: grp.endAngle,
    };
    const inflexionPoint = arcGenerator.centroid(inflexionInfo);

    const isRightLabel = inflexionPoint[0] > 0;
    const labelPosX = inflexionPoint[0] + 50 * (isRightLabel ? 1 : -1);
    const textAnchor = isRightLabel ? "start" : "end";
    const ticker = grp.data.name;
    const label = ticker + " (" + grp.value.toLocaleString("en-US") + "$)";
    const percentageOfPortfolio = grp.data.percentageOfPortfolio;

    return (
      <Link
        key={grp.data.name}
        to={{
          search: grp.data.name === "Others" ? "" : `selected=${ticker}`,
        }}
        onClick={(e) => {
          if (grp.data.name === "Others") e.preventDefault();
        }}
      >
        <defs>
          {colors.map((color, i) => (
            <radialGradient key={i} id={`holographic-gradient-${i}`}>
              <stop offset="0%" stopColor={color} />
              <stop offset="40%" stopColor={color} />
              <stop offset="100%" stopColor={color} />
            </radialGradient>
          ))}
          <filter id="glow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
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
            d={slicePath}
            fill={`url(#holographic-gradient-${i % colors.length})`}
            filter="url(#glow)"
          />
          <circle cx={centroid[0]} cy={centroid[1]} r={2} />
          <line
            x1={centroid[0]}
            y1={centroid[1]}
            x2={inflexionPoint[0]}
            y2={inflexionPoint[1]}
            stroke={theme.palette.text.primary}
            fill={theme.palette.text.primary}
          />
          <line
            x1={inflexionPoint[0]}
            y1={inflexionPoint[1]}
            x2={labelPosX}
            y2={inflexionPoint[1]}
            stroke={theme.palette.text.primary}
            fill={theme.palette.text.primary}
          />
          <text
            x={labelPosX + (isRightLabel ? 2 : -2)}
            y={inflexionPoint[1]}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            fontSize={14}
            fill={theme.palette.text.primary}
          >
            {label}
          </text>
          <text
            x={labelPosX + (isRightLabel ? 2 : -2)}
            y={inflexionPoint[1] + verticalOffset}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            fontSize={14}
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
