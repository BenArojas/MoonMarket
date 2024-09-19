import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { useTheme } from "@mui/material";
import CustomTooltip from "@/components/CustomToolTip";

export const CircularPacking = ({ width, height, data }) => {
    const svgRef = useRef(null);
    const circleRefs = useRef([]);
    const textRefs = useRef([]);
    const theme = useTheme();
    const colors = {
        positive: theme.palette.primary.light,
        // positive: "#a4c969",
        negative: theme.palette.error.dark,
    };

    const hierarchy = useMemo(() => {
        return d3
            .hierarchy(data)
            .sum((d) => d.value)
            .sort((a, b) => b.value - a.value);
    }, [data]);

    const packGenerator = useMemo(() => {
        return d3.pack().size([width, height]).padding(4);
    }, [width, height]);

    const root = useMemo(() => {
        return packGenerator(hierarchy);
    }, [hierarchy, packGenerator]);

    const colorScale = useMemo(() => {
        return d3.scaleOrdinal()
            .domain(["positive", "negative"])
            .range([colors.positive, colors.negative]);
    }, []);


    useEffect(() => {
        const simulation = d3
            .forceSimulation()
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("charge", d3.forceManyBody().strength(0.1))
            .force(
                "collide",
                d3
                    .forceCollide()
                    .strength(0.2)
                    .radius(function (d) {
                        return d.r + 3;
                    })
                    .iterations(1)
            );

        simulation.nodes(root.descendants().slice(1)).on("tick", () => {
            circleRefs.current.forEach((circleRef, index) => {
                if (circleRef) {
                    const node = root.descendants()[index + 1];
                    d3.select(circleRef)
                        .attr("cx", node.x)
                        .attr("cy", node.y);

                    d3.select(textRefs.current[index])
                        .attr("x", node.x)
                        .attr("y", node.y);
                }
            });
        });

        const dragBehavior = d3
            .drag()
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

        d3.selectAll(".node")
            .data(root.descendants().slice(1))
            .call(dragBehavior);

        return () => simulation.stop();
    }, [width, height, data, root, colorScale]);

    return (
        <svg ref={svgRef} width={width} height={height} style={{ display: "inline-block", boxShadow: "0 0 5px rgba(255, 255, 255, 0.5)"  }}>
            {root.descendants().slice(1).map((node, index) => {
                const {
                    ticker,
                    quantity,
                    percentageOfPortfolio,
                    avgSharePrice,
                    value,
                    last_price,
                    name
                } = node.data;

                return (
                    <CustomTooltip
                        percentageOfPortfolio={percentageOfPortfolio}
                        quantity={quantity}
                        name={name}
                        last_price={last_price}
                        avgSharePrice={avgSharePrice}
                        value={value}
                        key={index}
                    >
                        <circle
                            key={ticker}
                            ref={(el) => (circleRefs.current[index] = el)}
                            className="node"
                            cx={node.x}
                            cy={node.y}
                            r={node.r}
                            strokeWidth={1}
                            fill={colorScale(node.data.stockType)}
                            fillOpacity={0.8}
                        />
                    </CustomTooltip>
                );
            })}
            {root.descendants().slice(1).map((node, index) => {
                const { ticker } = node.data;

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
            })}
        </svg>
    );
};