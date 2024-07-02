import React, { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { useSpring, animated } from "@react-spring/web";

const MARGIN = { top: 30, right: 30, bottom: 50, left: 50 };

const LineChart = ({ width, height, data, dataType }) => {
  const axesRef = useRef(null);
  const boundsWidth = width - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  const yScale = useMemo(() => {
    const maxValue = d3.max(data, d => d.value);
    const minValue = d3.min(data, d => d.value);
    return d3.scaleLinear()
      .domain([minValue * 0.99, maxValue * 1.01])
      .range([boundsHeight, 0]);
  }, [data, boundsHeight]);

  const xScale = useMemo(() => {
    const extent = d3.extent(data, d => new Date(d.timestamp));
    console.log("X-axis extent:", extent);
    return d3.scaleTime()
      .domain(extent)
      .range([0, boundsWidth]);
  }, [data, boundsWidth]);

  useEffect(() => {
    const svgElement = d3.select(axesRef.current);
    svgElement.selectAll("*").remove();

    const xAxisGenerator = d3.axisBottom(xScale)
      .ticks(dataType === 'hourly' ? 5 : data.length)
      .tickFormat(d => {
        if (dataType === 'hourly') {
          return d3.timeFormat("%H:%M")(d);
        } else {
          return d3.timeFormat("%b %d")(d);
        }
      });
    
    svgElement
      .append("g")
      .attr("transform", `translate(0,${boundsHeight})`)
      .call(xAxisGenerator);

    const yAxisGenerator = d3.axisLeft(yScale);
    svgElement.append("g").call(yAxisGenerator);
  }, [xScale, yScale, boundsHeight, dataType, data.length]);

  const lineBuilder = d3.line()
    .x(d => xScale(new Date(d.timestamp)))
    .y(d => yScale(d.value));

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
          <LineItem path={linePath} color="#69b3a2" />
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

const LineItem = ({ path, color }) => {
  const springProps = useSpring({
    to: {
      path,
    },
    config: {
      friction: 100,
    },
  });

  return (
    <animated.path
      d={springProps.path}
      fill="none"
      stroke={color}
      strokeWidth={2}
    />
  );
};

export default LineChart;