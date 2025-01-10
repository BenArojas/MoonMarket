import React, { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import "@/styles/lineGraphAnimation.css";

const MARGIN = { top: 30, right: 30, bottom: 50, left: 50 };

export const LineChart = ({ width, height, data }) => {
  const axesRef = useRef(null);
  const boundsWidth = width - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  // Y axis
  const yScale = useMemo(() => {
    const [min, max] = d3.extent(data, (d) => d.value);
    const padding = (max - min) * 0.1;
    return d3
      .scaleLinear()
      .domain([min - padding, max + padding])
      .range([boundsHeight, 0]);
  }, [data, boundsHeight]);

  // X axis
  const xScale = useMemo(() => {
    return d3
      .scalePoint()
      .domain(data.map((d) => d.timestamp))
      .range([0, boundsWidth])
      .padding(0.25);
  }, [data, boundsWidth]);

  useEffect(() => {
    const svgElement = d3.select(axesRef.current);
    svgElement.selectAll("*").remove();

    const xAxisGenerator = d3.axisBottom(xScale).tickFormat((d) => {
      const date = new Date(d);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    svgElement
      .append("g")
      .attr("transform", `translate(0,${boundsHeight})`)
      .call(xAxisGenerator);
    const yAxisGenerator = d3.axisLeft(yScale).tickFormat(d3.format(","));
    svgElement.append("g").call(yAxisGenerator);
    svgElement.selectAll("path,line").remove();
  }, [xScale, yScale, boundsHeight]);

  // Build the line and area
  const lineBuilder = d3
    .line()
    .x((d) => xScale(d.timestamp))
    .y((d) => yScale(d.value)).curve(d3.curveCatmullRom.alpha(0.5))

  const areaBuilder = d3
    .area()
    .x((d) => xScale(d.timestamp))
    .y0(boundsHeight)
    .y1((d) => yScale(d.value)).curve(d3.curveCatmullRom.alpha(0.5))

  const linePath = lineBuilder(data);
  const areaPath = areaBuilder(data);

  if (!linePath || !areaPath) {
    return null;
  }

  return (
    <div className="chart-container">
      <svg width={width} height={height} >
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#077e5d" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#077e5d" stopOpacity={0.0} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g
          width={boundsWidth}
          height={boundsHeight}
          transform={`translate(${MARGIN.left},${MARGIN.top})`}
        >
          <path
          className="area-path"
            d={areaPath}
            fill="url(#areaGradient)"
          />
          <path
           className="line-path"
            d={linePath}
            opacity={1}
            stroke="#077e5d"
            fill="none"
            strokeWidth={2}
            filter="url(#glow)"
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