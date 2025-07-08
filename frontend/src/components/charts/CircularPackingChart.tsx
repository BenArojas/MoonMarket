import React, { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import { useTheme } from "@mui/material";
import { CircularData, StockChild } from "@/utils/dataProcessing";
import CustomTooltip from "./CustomToolTip";

// Define props for CircularPacking
interface CircularPackingProps {
  width: number;
  height: number;
  data: CircularData;
}

// Define the type for D3 hierarchy node data
interface NodeData extends d3.HierarchyCircularNode<StockChild | CircularData> {
  x: number;
  y: number;
  r: number;
  fx?: number | null;
  fy?: number | null;
}

export const CircularPacking: React.FC<CircularPackingProps> = ({
  width,
  height,
  data,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const theme = useTheme();

  // Use a ref to store the nodes to persist their positions
  const nodesRef = useRef<NodeData[] | null>(null);

  const colors = {
    positive: theme.palette.primary.light,
    negative: theme.palette.error.dark,
  };

  // Memoized color scale
  const colorScale = useMemo(() => {
    return d3
      .scaleOrdinal<string>()
      .domain(["positive", "negative"])
      .range([colors.positive, colors.negative]);
  }, [colors.positive, colors.negative]);

  // This effect runs only when data changes to update radii and other properties
  useEffect(() => {
    if (!data || !nodesRef.current) {
      // If there's no data or nodes haven't been initialized, do nothing
      return;
    }

    const hierarchy = d3.hierarchy<CircularData>(data).sum((d) => d.value);
    const packGenerator = d3
      .pack<StockChild | CircularData>()
      .size([width, height])
      .padding(4);
    const root = packGenerator(hierarchy);
    const newNodesData = root.descendants().slice(1) as NodeData[];

    // Update the existing nodes with new data (like radius)
    // This preserves the x, y, fx, and fy properties from the simulation
    nodesRef.current.forEach((node) => {
      const newNode = newNodesData.find(
        (n) => (n.data as StockChild).ticker === (node.data as StockChild).ticker
      );
      if (newNode) {
        node.r = newNode.r; // Update the radius
        node.data = newNode.data; // Update other data properties if needed
      }
    });

    // Update the circles in the DOM
    const svg = d3.select(svgRef.current);
    svg
      .selectAll<SVGCircleElement, NodeData>(".node")
      .data(nodesRef.current, (d: any) => (d.data as StockChild).ticker)
      .transition()
      .duration(500) // Smooth transition for radius change
      .attr("r", (d) => d.r)
      .attr("fill", (d) => colorScale((d.data as StockChild).stockType));
  }, [data, width, height, colorScale]);

  // This effect runs only once to set up the simulation
  useEffect(() => {
    const hierarchy = d3.hierarchy<CircularData>(data).sum((d) => d.value);
    const packGenerator = d3
      .pack<StockChild | CircularData>()
      .size([width, height])
      .padding(4);
    const root = packGenerator(hierarchy);
    nodesRef.current = root.descendants().slice(1) as NodeData[];

    const svg = d3.select(svgRef.current);

    // Remove any existing elements before drawing
    svg.selectAll("*").remove();

    // Create a group for all elements to be added
    const g = svg.append("g");

    const circles = g
      .selectAll(".node")
      .data(nodesRef.current, (d: any) => (d.data as StockChild).ticker)
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.r)
      .attr("strokeWidth", 1)
      .attr("fill", (d) => colorScale((d.data as StockChild).stockType))
      .attr("fill-opacity", 0.8);

    const labels = g
      .selectAll(".label")
      .data(nodesRef.current, (d: any) => (d.data as StockChild).ticker)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("font-size", 13)
      .attr("font-weight", 0.4)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("fill", "white")
      .attr("class", "font-medium")
      .text((d) => (d.data as StockChild).ticker);

    const simulation = d3
      .forceSimulation<NodeData>(nodesRef.current)
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.1))
      .force(
        "collide",
        d3
          .forceCollide<NodeData>()
          .radius((d) => d.r + 3)
          .strength(0.2)
      )
      .on("tick", () => {
        circles.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
        labels.attr("x", (d) => d.x).attr("y", (d) => d.y);
      });

    const dragBehavior = d3
      .drag<SVGCircleElement, NodeData>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        // Do not nullify fx and fy to maintain position
        // d.fx = null;
        // d.fy = null;
      });

    circles.call(dragBehavior);

    return () => {
      simulation.stop();
    };
    // This effect should only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Your JSX remains largely the same, but we don't render the circles directly.
  // D3 is now in charge of the SVG content.
  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{
        display: "inline-block",
        boxShadow: "0 0 5px rgba(255, 255, 255, 0.5)",
      }}
    ></svg>
  );
};