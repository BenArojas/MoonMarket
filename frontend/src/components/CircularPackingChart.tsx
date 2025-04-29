import React, { useEffect, useRef, useMemo } from "react";
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
  
  export const CircularPacking: React.FC<CircularPackingProps> = ({ width, height, data }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const circleRefs = useRef<(SVGCircleElement | null)[]>([]);
    const textRefs = useRef<(SVGTextElement | null)[]>([]);
    const theme = useTheme();
  
    const colors = {
      positive: theme.palette.primary.light,
      negative: theme.palette.error.dark,
    };
  
    // Memoized D3 hierarchy
    const hierarchy = useMemo(() => {
      const hier = d3
        .hierarchy<CircularData>(data)
        .sum((d) => d.value);
      // Sort after summing to ensure value is defined
      return hier.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    }, [data]);
  
    // Memoized D3 pack generator
    const packGenerator = useMemo(() => {
      return d3.pack<StockChild | CircularData>().size([width, height]).padding(4);
    }, [width, height]);
  
    // Memoized root node
    const root = useMemo(() => {
      return packGenerator(hierarchy);
    }, [hierarchy, packGenerator]);
  
    // Memoized color scale
    const colorScale = useMemo(() => {
      return d3
        .scaleOrdinal<string>()
        .domain(["positive", "negative"])
        .range([colors.positive, colors.negative]);
    }, [colors.positive, colors.negative]);
  
    useEffect(() => {
      // D3 force simulation
      const simulation = d3
        .forceSimulation<NodeData>()
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("charge", d3.forceManyBody().strength(0.1))
        .force(
          "collide",
          d3
            .forceCollide<NodeData>()
            .strength(0.2)
            .radius((d) => d.r + 3)
            .iterations(1)
        );
  
      simulation.nodes(root.descendants().slice(1) as NodeData[]).on("tick", () => {
        circleRefs.current.forEach((circleRef, index) => {
          if (circleRef) {
            const node = root.descendants()[index + 1] as NodeData;
            d3.select(circleRef)
              .attr("cx", node.x)
              .attr("cy", node.y);
  
            d3.select(textRefs.current[index])
              .attr("x", node.x)
              .attr("y", node.y);
          }
        });
      });
  
      // D3 drag behavior
      const dragBehavior = d3
        .drag<SVGCircleElement, NodeData>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.03).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });
  
      d3.selectAll<SVGCircleElement, NodeData>(".node")
        .data(root.descendants().slice(1) as NodeData[])
        .call(dragBehavior);
  
      // Cleanup simulation on unmount
      return () => {
        simulation.stop();
      };
    }, [width, height, root, colors.positive, colors.negative]);
  
    return (
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: "inline-block", boxShadow: "0 0 5px rgba(255, 255, 255, 0.5)" }}
      >
        {(root.descendants().slice(1) as NodeData[]).map((node, index) => {
          // Skip the root node, which has CircularData type
          if ("ticker" in node.data) {
            const {
              ticker,
              quantity,
              percentageOfPortfolio,
              avgSharePrice,
              value,
              last_price,
              name,
              stockType,
            } = node.data as StockChild;
  
            return (
              <CustomTooltip
                key={index}
                percentageOfPortfolio={percentageOfPortfolio}
                quantity={quantity}
                name={name}
                last_price={last_price}
                avgSharePrice={avgSharePrice}
                value={value}
              >
                <circle
                  key={ticker}
                  ref={(el) => (circleRefs.current[index] = el)}
                  className="node"
                  cx={node.x}
                  cy={node.y}
                  r={node.r}
                  strokeWidth={1}
                  fill={colorScale(stockType)}
                  fillOpacity={0.8}
                />
              </CustomTooltip>
            );
          }
          return null;
        })}
        {(root.descendants().slice(1) as NodeData[]).map((node, index) => {
          if ("ticker" in node.data) {
            const { ticker } = node.data as StockChild;
  
            return (
              <text
                key={ticker}
                ref={(el) => (textRefs.current[index] = el)}
                x={node.x}
                y={node.y}
                fontSize={13}
                fontWeight={0.4}
                textAnchor="middle"
                alignmentBaseline="middle"
                fill="white"
                className="font-medium"
              >
                {ticker}
              </text>
            );
          }
          return null;
        })}
      </svg>
    );
  };