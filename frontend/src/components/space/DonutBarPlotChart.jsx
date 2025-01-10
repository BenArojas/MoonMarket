import { useMemo, useState } from "react";
import * as d3 from "d3";
import { ShapeRenderer } from "@/components/space/Shaperender";

const MARGIN = { top: 10, right: 10, bottom: 10, left: 10 };
const BAR_PADDING = 0.3;
const MARGIN_PIE = 50;
const INFLEXION_PADDING = 25;

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


export const DonutBarplotChart = ({
  width,
  height,
  data,
  type,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const sortedData = data.sort((a, b) => b.portfolio_percentage - a.portfolio_percentage);
  const groups = sortedData.map((d) => d.name);

  const radius = Math.min(width, height) / 2 - MARGIN_PIE;

  const pie = useMemo(() => {
    const pieGenerator = d3
      .pie()
      .value((d) => d.portfolio_percentage || 0)
      .sort(null);
    return pieGenerator(sortedData);
  }, [sortedData]);

  const boundsWidth = width - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  const yScale = useMemo(() => {
    return d3
      .scaleBand()
      .domain(groups)
      .range([-boundsHeight / 2, boundsHeight / 2])
      .padding(BAR_PADDING);
  }, [groups, boundsHeight]);

  const xScale = useMemo(() => {
    const max = d3.max(sortedData, d => d.portfolio_percentage) || 100;
    return d3
      .scaleLinear()
      .domain([0, max])
      .range([0, boundsWidth / 2]);
  }, [sortedData, boundsWidth]);

  const arcGenerator = d3.arc();

  const allPaths = pie.map((slice, i) => {
    const sliceInfo = {
      innerRadius: radius / 2,
      outerRadius: radius,
      startAngle: slice.startAngle,
      endAngle: slice.endAngle,
    };

    const centroid = arcGenerator.centroid(sliceInfo);
    const slicePath = arcGenerator(sliceInfo);

    const inflexionInfo = {
      innerRadius: radius + INFLEXION_PADDING,
      outerRadius: radius + INFLEXION_PADDING,
      startAngle: slice.startAngle,
      endAngle: slice.endAngle,
    };
    const inflexionPoint = arcGenerator.centroid(inflexionInfo);

    const isRightLabel = inflexionPoint[0] > 0;
    const labelPosX = inflexionPoint[0] + 50 * (isRightLabel ? 1 : -1);
    const textAnchor = isRightLabel ? "start" : "end";
    const label = slice.data.name;
    const percentageLabel = `${slice.data.portfolio_percentage.toFixed(2)}%`;

    const y = yScale(slice.data.name);
    const x = xScale(slice.data.portfolio_percentage);
    const x0 = xScale(0);
    const bw = yScale.bandwidth();

    const rectPath = `M ${x0} ${y} L ${x} ${y} L ${x} ${y + bw} L ${x0} ${y + bw} Z`;

    return (

      <g
        key={slice.data.name}
        className="slice"
        onMouseEnter={() => setHoveredIndex(i)}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <ShapeRenderer
          path={type === "pie" ? slicePath : rectPath}
          color={colors[i % colors.length]}
          index={i}
        />
        {type === "pie" && hoveredIndex === i && (
          <>
            <line
              x1={centroid[0]}
              y1={centroid[1]}
              x2={inflexionPoint[0]}
              y2={inflexionPoint[1]}
              stroke={"white"}
              fill={"white"}
            />
            <line
              x1={inflexionPoint[0]}
              y1={inflexionPoint[1]}
              x2={labelPosX}
              y2={inflexionPoint[1]}
              stroke={"white"}
              fill={"white"}
            />
            <text
              x={labelPosX + (isRightLabel ? 2 : -2)}
              y={inflexionPoint[1]}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              fontSize={12}
              fill={"white"}
              style={{
                textShadow: '0 0 3px #000, 0 0 5px #000'
              }}
            >
              {label}
            </text>
            <text
              x={labelPosX + (isRightLabel ? 2 : -2)}
              y={inflexionPoint[1] + 15}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              fontSize={16}
              fill={"white"}
            >
              {percentageLabel}
            </text>
          </>
        )}

        {type === "bar" && (
          <>
            <text
              x={x0 - 5}
              y={y + bw / 2}
              dominantBaseline="middle"
              textAnchor="end"
              fontSize={14}
              fill="white"
            >
              {slice.data.name}
            </text>
            {slice.data.portfolio_percentage > 4 && <text
              x={x - 5}
              y={y + bw / 2}
              dominantBaseline="middle"
              textAnchor="end"
              fontSize={12}
              fill="white"
            >
              {percentageLabel}
            </text>}
          </>
        )}
      </g>
    );
  });

  return (
    <>
      <style>{shimmerStyle}</style>
      <svg width={width} height={height} style={{ display: "inline-block" }}>
        <g transform={`translate(${width / 2}, ${height / 2})`}>
          {allPaths}
        </g>
      </svg>
    </>
  );
};