import React, { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";

const MARGIN = { top: 30, right: 30, bottom: 50, left: 50 };

export const LineChart = ({ width, height, data }) => {
  const axesRef = useRef(null);
  const boundsWidth = width - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  // Y axis
  const yScale = useMemo(() => {
    const [min, max] = d3.extent(data, (d) => d.value);
    const padding = (max - min) * 0.1; // Add 10% padding
    return d3
      .scaleLinear()
      .domain([min - padding, max + padding])
      .range([boundsHeight, 0]);
  }, [data, boundsHeight]);

  // X axis
  const xScale = useMemo(() => {
    return d3
      .scalePoint()
      .domain(data.map(d => d.timestamp))
      .range([0, boundsWidth])
      .padding(0.5);
  }, [data, boundsWidth]);

  // Render the X and Y axis using d3.js, not react
  useEffect(() => {
    const svgElement = d3.select(axesRef.current);
    svgElement.selectAll("*").remove();

    const xAxisGenerator = d3.axisBottom(xScale)
      .tickFormat(d => {
        const date = new Date(d);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      });
    svgElement
      .append("g")
      .attr("transform", `translate(0,${boundsHeight})`)
      .call(xAxisGenerator);

    const yAxisGenerator = d3.axisLeft(yScale)
      .tickFormat(d3.format(","));
    svgElement.append("g").call(yAxisGenerator);
  }, [xScale, yScale, boundsHeight]);

  // Build the line
  const lineBuilder = d3
    .line()
    .x((d) => xScale(d.timestamp))
    .y((d) => yScale(d.value));

  const linePath = lineBuilder(data);

  if (!linePath) {
    return null;
  }

  return (
    <div>
      <svg width={width} height={height}>
        <g
          width={boundsWidth}
          height={boundsHeight}
          transform={`translate(${MARGIN.left},${MARGIN.top})`}
        >
          <path
            d={linePath}
            opacity={1}
            stroke="#C4C4C4" //Silver
            fill="none"
            strokeWidth={2}
          />
        </g>
        <g
          width={boundsWidth}
          height={boundsHeight}
          ref={axesRef}
          transform={`translate(${MARGIN.left},${MARGIN.top})`}
        />
      </svg>
    </div>
  );
};