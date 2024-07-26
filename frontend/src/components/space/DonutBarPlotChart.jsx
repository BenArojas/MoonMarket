import { useMemo, useState } from "react";
import * as d3 from "d3";
import { ShapeRenderer } from "@/components/space/Shaperender";


const MARGIN = { top: 30, right: 150, bottom: 30, left: 250 };
const BAR_PADDING = 0.3;
const MARGIN_PIE = 30;
const INFLEXION_PADDING = 25;

const colors = [
  "#e0ac2b", "#e85252", "#6689c6", "#9a6fb0", "#a53253", "#69b3a2",
  // Add more colors if needed
];

export const DonutBarplotChart = ({
  width,
  height,
  data,
  type,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const sortedData = data.sort((a, b) => b.portfolio_percentage - a.portfolio_percentage);
  const groups = sortedData.map((d) => d.name);

  const radius = Math.min(width - MARGIN.left - MARGIN.right, height - MARGIN.top - MARGIN.bottom) / 2 - MARGIN_PIE;

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
      .range([0, boundsHeight])
      .padding(BAR_PADDING);
  }, [groups, boundsHeight]);

  const xScale = useMemo(() => {
    const max = d3.max(sortedData, d => d.portfolio_percentage) || 100;
    return d3
      .scaleLinear()
      .domain([0, max])
      .range([0, boundsWidth]);
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
    <svg width={width} height={height} style={{ display: "inline-block" }}>
      <g transform={
        type === "pie"
          ? `translate(${width / 2}, ${height / 2})`
          : `translate(${MARGIN.left}, ${MARGIN.top})`
      }>
        {allPaths}
      </g>
    </svg>
  );
};