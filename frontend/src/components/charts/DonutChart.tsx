import { useStockStore } from "@/stores/stockStore";
import "@/styles/donut-chart.css";
import { Box, Button, ButtonGroup, useMediaQuery, useTheme } from "@mui/material";
import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";

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

// Updated types to match your new data structure
export interface DonutDatum {
  name: string;
  value: number;
  percentageOfPortfolio: number;
}


interface DonutChartProps {
  width: number;
  height: number;
  data: DonutDatum[];
  onSliceClick?: (datum: DonutDatum) => void;
}

export const DonutChart = ({ width, height, data, onSliceClick }: DonutChartProps) => {
  const ref = useRef<SVGGElement>(null);
  const theme = useTheme();
  const isMobileScreen: boolean = useMediaQuery(theme.breakpoints.down("sm"));

  const allocationView = useStockStore((s) => s.allocationView);
  const setAllocationView = useStockStore((s) => s.setAllocationView);
  const subscribeToAlocation = useStockStore((s) => s.subscribeToAllocation);

  useEffect(() => {
    // When the component mounts, ask the backend for the latest allocation data.
    // Assume 'sendSocketMessage' is your function to send JSON to the backend WebSocket.
    subscribeToAlocation()
  }, []); // Empty dependency array means this runs once on mount.
  

  // Calculate chart size and margins for mobile
  const radius: number = Math.min(width - 2 * MARGIN_X, height - 2 * MARGIN_Y) / 2.2;
  const innerRadius: number = radius / 2.5;
  const verticalOffset: number = isMobileScreen ? 14 : 18;
  const fontSize: number = isMobileScreen ? 10 : 14;
  const labelHeight = verticalOffset + fontSize;

  const pie = useMemo(() => {
    const pieGenerator = d3
      .pie<DonutDatum>()
      .value((d: DonutDatum) => d.value)
      .sort(null); 
    return pieGenerator(data);
  }, [data]);

  const arcGenerator = d3.arc();

  // NEW: Pre-calculate all label positions
  const labelPositions = useMemo(() => {
    // 1. Calculate initial positions for all labels
    const allLabels = pie.map((grp) => {
      const sliceInfo = { innerRadius, outerRadius: radius, startAngle: grp.startAngle, endAngle: grp.endAngle };
      const inflexionInfo = { innerRadius: radius + INFLEXION_PADDING, outerRadius: radius + INFLEXION_PADDING, startAngle: grp.startAngle, endAngle: grp.endAngle };
      
      const centroid = arcGenerator.centroid(sliceInfo);
      const inflexionPoint = arcGenerator.centroid(inflexionInfo);
      const isRightLabel = inflexionPoint[0] > 0;
      const labelPosX = inflexionPoint[0] + 50 * (isRightLabel ? 1 : -1);

      return {
        ...grp.data,
        slice: grp, // Keep a reference to the original pie group
        initialY: inflexionPoint[1],
        y: inflexionPoint[1], // This 'y' will be adjusted
        x: labelPosX,
        isRight: isRightLabel,
        centroid,
      };
    });

    // 2. Separate into left and right, and sort by initial vertical position
    const leftLabels = allLabels.filter(d => !d.isRight).sort((a, b) => a.initialY - b.initialY);
    const rightLabels = allLabels.filter(d => d.isRight).sort((a, b) => a.initialY - b.initialY);

    // 3. Resolve overlaps for each side (two passes: top-down then bottom-up)
    [leftLabels, rightLabels].forEach(labels => {
        // Top-down pass
        for (let i = 1; i < labels.length; i++) {
            if (labels[i].y < labels[i-1].y + labelHeight) {
                labels[i].y = labels[i-1].y + labelHeight;
            }
        }
        // Bottom-up pass
        for (let i = labels.length - 2; i >= 0; i--) {
            if (labels[i].y > labels[i+1].y - labelHeight) {
                labels[i].y = labels[i+1].y - labelHeight;
            }
        }
    });
    
    // 4. Create a map for easy lookup during render
    const positionsMap = new Map();
    allLabels.forEach(label => positionsMap.set(label.name, label));
    
    return positionsMap;
  }, [pie, radius, innerRadius, labelHeight]);

  const shapes: JSX.Element[] = pie.map((grp, i) => {

    const finalLabel = labelPositions.get(grp.data.name);
    if (!finalLabel) return null;

    const sliceInfo = {
      innerRadius,
      outerRadius: radius,
      startAngle: grp.startAngle,
      endAngle: grp.endAngle,
    };

    const slicePath: string | null = arcGenerator(sliceInfo);

    const textAnchor: string = finalLabel.isRight ? "start" : "end";
    const labelText: string = `${finalLabel.name} ($${finalLabel.value.toLocaleString("en-US")})`;

    const fontSize: number = isMobileScreen ? 10 : 14;

    return (
      <g key={i}>
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
          className="slice"
          style={{ cursor: onSliceClick ? "pointer" : "default" }}
          onClick={() => onSliceClick?.(grp.data)}
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
            x1={finalLabel.centroid[0]}
            y1={finalLabel.centroid[1]}
            x2={finalLabel.x}
            y2={finalLabel.y} // Use the final adjusted 'y'
            stroke={theme.palette.text.primary}
            strokeWidth="1"
          />
          <text
            x={finalLabel.x + (finalLabel.isRight ? 2 : -2)}
            y={finalLabel.y} // Use the final adjusted 'y'
            textAnchor={textAnchor}
            dominantBaseline="middle"
            fontSize={fontSize}
            fill={theme.palette.text.primary}
          >
            {labelText}
          </text>
          <text
            x={finalLabel.x + (finalLabel.isRight ? 2 : -2)}
            y={finalLabel.y + verticalOffset} // Position percentage below the main label
            textAnchor={textAnchor}
            dominantBaseline="middle"
            fontSize={fontSize}
            fill={theme.palette.text.primary}
          >
            {finalLabel.percentageOfPortfolio}%
          </text>
        </g>
      </g>
    );
  }).filter(Boolean);;

  return (
    <Box sx={{ 
      display: "flex", 
      alignItems: "center", 
      gap: 3,
      position: "relative" 
    }}>
      {/* View Selection Buttons */}
      <Box sx={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: 1,
        minWidth: 120
      }}>
        <ButtonGroup 
          orientation="vertical" 
          variant="outlined"
          size="small"
        >
          <Button
            variant={allocationView === "assetClass" ? "contained" : "outlined"}
            onClick={() => setAllocationView("assetClass")}
            sx={{ 
              textTransform: "none",
              fontSize: isMobileScreen ? "0.75rem" : "0.875rem"
            }}
          >
            Asset Class
          </Button>
          <Button
            variant={allocationView === "sector" ? "contained" : "outlined"}
            onClick={() => setAllocationView("sector")}
            sx={{ 
              textTransform: "none",
              fontSize: isMobileScreen ? "0.75rem" : "0.875rem"
            }}
          >
            Sector
          </Button>
          <Button
            variant={allocationView === "group" ? "contained" : "outlined"}
            onClick={() => setAllocationView("group")}
            sx={{ 
              textTransform: "none",
              fontSize: isMobileScreen ? "0.75rem" : "0.875rem"
            }}
          >
            Group
          </Button>
        </ButtonGroup>
      </Box>

      {/* Chart */}
      <Box sx={{ position: "relative" }}>
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
    </Box>
  );
};