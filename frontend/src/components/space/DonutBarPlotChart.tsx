import { useMemo, useState } from "react";
import * as d3 from "d3";
import { ShapeRenderer } from "@/components/space/Shaperender"; // Assuming this path is correct
import { SpaceshipHolding } from "@/pages/Space"; // Assuming this path and type definition are correct

const MARGIN = { top: 10, right: 10, bottom: 10, left: 10 };
const BAR_PADDING = 0.3;
const MARGIN_PIE = 50;
const INFLEXION_PADDING = 25; // Distance from outer radius to start label line

const colors = [
  "#00ffff", // Cyan
  "#ff00ff", // Magenta
  "#ffff00", // Yellow
  "#ff1493", // Deep Pink
  "#7fff00", // Chartreuse
  "#ff4500", // Orange Red
  "#1e90ff", // Dodger Blue
  "#ff69b4", // Hot Pink
];

// Simple shimmer CSS
const shimmerStyle = `
  @keyframes shimmer {
    0% { opacity: 0.7; }
    50% { opacity: 1; }
    100% { opacity: 0.7; }
  }
  .holographic-shape {
    animation: shimmer 4s infinite;
  }
`;

interface DonutBarplotChartProps {
  width: number;
  height: number;
  type: "pie" | "bar"; // Use literal types for better type safety
  data: SpaceshipHolding[];
}

// Extend d3's PieArcDatum to ensure our data structure is included
interface PieSlice extends d3.PieArcDatum<SpaceshipHolding> {
  // No need to redefine 'data', 'value', 'index', etc.
  // d3.PieArcDatum already includes them generically.
  // Just ensure the generic type is SpaceshipHolding
}

export const DonutBarplotChart = ({
  width,
  height,
  data,
  type,
}: DonutBarplotChartProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Ensure data is always an array to prevent runtime errors if data is undefined/null
  const validData = data || [];

  // Sort data once
  const sortedData = useMemo(() => {
    // Create a copy before sorting to avoid mutating the original prop array
    return [...validData].sort(
      (a, b) => (b.portfolio_percentage || 0) - (a.portfolio_percentage || 0)
    );
  }, [validData]);

  const groups = useMemo(() => sortedData.map((d) => d.name), [sortedData]);

  const radius = Math.min(width, height) / 2 - MARGIN_PIE;

  const pie = useMemo(() => {
    const pieGenerator = d3
      .pie<SpaceshipHolding>()
      .value((d) => d.portfolio_percentage || 0)
      .sort(null); // Use explicit null sort as we already sorted `sortedData`
    return pieGenerator(sortedData);
  }, [sortedData]);

  const boundsWidth = width - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  // Scales
  const yScale = useMemo(() => {
    return d3
      .scaleBand()
      .domain(groups)
      .range([-boundsHeight / 2, boundsHeight / 2]) // Centered for bar chart
      .padding(BAR_PADDING);
  }, [groups, boundsHeight]);

  const xScale = useMemo(() => {
    const max = d3.max(sortedData, (d) => d.portfolio_percentage);
    return d3
      .scaleLinear()
      .domain([0, max || 100]) // Provide a fallback max value
      .range([0, boundsWidth / 2]); // Use half width for centered bar chart
  }, [sortedData, boundsWidth]);

  // Arc generator for Pie chart
  const arcGenerator = useMemo(() => {
    return d3.arc<PieSlice>() // Use the PieSlice interface here
      .innerRadius(radius * 0.5) // Example: inner radius half of outer
      .outerRadius(radius);
  }, [radius]);

  const allPaths = pie.map((slice: PieSlice, i: number) => {
    // --- Pie Chart Calculations ---
    const slicePath = arcGenerator(slice); // Pass the slice data directly
    const centroid = arcGenerator.centroid(slice); // Pass the slice data directly

    // Calculate inflexion point using trigonometry
    const midAngle = slice.startAngle + (slice.endAngle - slice.startAngle) / 2;
    const inflexionRadius = radius + INFLEXION_PADDING;
    // Adjust angle for standard Cartesian coordinates (0 rad = positive x-axis)
    // D3 angles: 0 = top, positive = clockwise. Trig angles: 0 = right, positive = counter-clockwise
    const trigAngle = midAngle - Math.PI / 2;
    const inflexionPoint: [number, number] = [
        Math.cos(trigAngle) * inflexionRadius,
        Math.sin(trigAngle) * inflexionRadius,
    ];

    const isRightLabel = inflexionPoint[0] > 0;
    const labelPosX = inflexionPoint[0] + 30 * (isRightLabel ? 1 : -1); // Adjust label horizontal distance
    const textAnchor = isRightLabel ? "start" : "end";
    const label = slice.data.name;
    const percentageLabel = `${(slice.data.portfolio_percentage || 0).toFixed(2)}%`;


    // --- Bar Chart Calculations ---
    const y = yScale(slice.data.name);
    const xValue = slice.data.portfolio_percentage || 0;
    const x = xScale(xValue);
    const x0 = xScale(0);
    const barWidth = x - x0; // Calculate width based on scale
    const bw = yScale.bandwidth();

    // Handle potential undefined 'y' from scaleBand
    if (y === undefined) {
        console.warn(`Warning: Could not calculate y position for bar "${slice.data.name}". Skipping.`);
        return null; // Don't render this item if 'y' is undefined
    }

    // Create path string for the bar rectangle
    // Using positive barWidth for clarity, adjust start point if needed
    const rectPath = `M ${x0} ${y} h ${barWidth} v ${bw} h ${-barWidth} Z`;


    return (
      <g
        key={slice.data.name}
        className="slice" // Keep class for potential CSS targeting
        onMouseEnter={() => setHoveredIndex(i)}
        onMouseLeave={() => setHoveredIndex(null)}
        opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.6} // Example hover effect
        style={{ transition: "opacity 0.2s ease-in-out" }} // Smooth transition
      >
        {/* Use ShapeRenderer for both types, passing the correct path */}
        <ShapeRenderer
          path={type === "pie" ? (slicePath || "") : rectPath} // Provide fallback for slicePath just in case
          color={colors[i % colors.length]}
          index={i}
        />

        {/* Labels for Pie Chart (only shown on hover for this example) */}
        {type === "pie" && hoveredIndex === i && (
          <>
            {/* Line from centroid to inflexion point */}
            <line
              x1={centroid[0]}
              y1={centroid[1]}
              x2={inflexionPoint[0]}
              y2={inflexionPoint[1]}
              stroke={"white"}
              strokeWidth={1.5}
            />
            {/* Line from inflexion point to label start */}
            <line
              x1={inflexionPoint[0]}
              y1={inflexionPoint[1]}
              x2={labelPosX}
              y2={inflexionPoint[1]} // Horizontal line
              stroke={"white"}
              strokeWidth={1.5}
            />
            {/* Label Text */}
            <text
              x={labelPosX + (isRightLabel ? 2 : -2)} // Small padding from line end
              y={inflexionPoint[1]} // Position vertically at the line
              textAnchor={textAnchor}
              dominantBaseline="middle"
              fontSize={12}
              fill={"white"}
              style={{
                textShadow: "0 0 3px #000, 0 0 5px #000", // Make text readable
                pointerEvents: "none", // Prevent text from blocking mouse events on shapes
              }}
            >
              {label}
            </text>
             {/* Percentage Text (below label) */}
            <text
              x={labelPosX + (isRightLabel ? 2 : -2)}
              y={inflexionPoint[1] + 15} // Offset below the name label
              textAnchor={textAnchor}
              dominantBaseline="middle"
              fontSize={14} // Slightly larger percentage
              fontWeight="bold"
              fill={"white"}
               style={{
                textShadow: "0 0 3px #000, 0 0 5px #000",
                pointerEvents: "none",
              }}
            >
              {percentageLabel}
            </text>
          </>
        )}

        {/* Labels for Bar Chart */}
        {type === "bar" && (
          <>
            {/* Bar Name Label (to the left of the bar) */}
            <text
              x={x0 - 5} // Position left of the bar start
              y={y + bw / 2} // Center vertically in the bar
              dominantBaseline="middle"
              textAnchor="end" // Align text right
              fontSize={12}
              fill="white"
               style={{ pointerEvents: "none" }}
            >
              {slice.data.name}
            </text>
            {/* Percentage Label (inside the bar if it fits, otherwise maybe outside?) */}
            {/* Show inside if bar is wide enough */}
            {barWidth > 35 && ( // Only show if bar width is > 35px (adjust threshold as needed)
              <text
                x={x - 5} // Position near the right edge of the bar
                y={y + bw / 2} // Center vertically
                dominantBaseline="middle"
                textAnchor="end"
                fontSize={11}
                fill="black" // Contrast color for inside the bar
                style={{ pointerEvents: "none" }}
              >
                {percentageLabel}
              </text>
            )}
             {/* Show outside if bar is too small */}
             {barWidth <= 35 && xValue > 0 && (
                 <text
                    x={x + 5} // Position to the right of the bar end
                    y={y + bw / 2} // Center vertically
                    dominantBaseline="middle"
                    textAnchor="start"
                    fontSize={11}
                    fill="white" // Text outside the bar
                    style={{ pointerEvents: "none" }}
                >
                 {percentageLabel}
                </text>
             )}
          </>
        )}
      </g>
    );
  }).filter(Boolean); // Filter out any nulls returned from the map (due to y === undefined check)


  return (
    <>
      {/* Inject shimmer style */}
      <style>{shimmerStyle}</style>
      <svg width={width} height={height} style={{ display: "inline-block" }}>
        {/* Center the chart */}
        <g transform={`translate(${width / 2}, ${height / 2})`}>
            {allPaths}
        </g>
      </svg>
    </>
  );
};