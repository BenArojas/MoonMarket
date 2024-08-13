import { useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import "@/styles/donut-chart.css";
import { useNavigate, Link } from "react-router-dom";
import { Box, Button } from "@mui/material";
import { useTheme } from "@mui/material";

const MARGIN_X = 150;
const MARGIN_Y = 50;
const INFLEXION_PADDING = 25;

const colors = [
  "#077e5d", // Your main metallic green
  "#f2c94c", // Complementary golden yellow
  "#2d9cdb", // Cool blue
  "#eb5757", // Accent red
  "#6fcf97", // Light green
  "#bb6bd9", // Purple
  "#4f4f4f", // Dark gray
  "#ff9800", // Orange
  "#00bcd4", // Cyan
];

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

    // const handleClick = (stockData) => {
    //   const showOthersClicked =
    //   if (stockData.name === "Others" && !showOthers) {
    //     setShowOthers(true);
    //   } else if (showOthers) {
    //     setShowOthers(false);
    //   } else {
    //   }
    // };

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
              <stop offset="0%" stopColor={color} stopOpacity="0.6" />
              <stop offset="40%" stopColor={color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
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
