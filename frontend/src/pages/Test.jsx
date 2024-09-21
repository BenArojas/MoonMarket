import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';


const SankeyChart = ({ data, width = 1000, height = 600 }) => {
  const svgRef = useRef();

  useEffect(() => {
    // Define dimensions and create SVG element
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Define the Sankey layout generator
    const sankeyGenerator = sankey()
      .nodeWidth(20)
      .nodePadding(10)
      .extent([[1, 1], [width - 1, height - 6]]);

    // Generate the Sankey layout
    const sankeyData = sankeyGenerator({
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d }))
    });

    // Clear previous SVG content
    svg.selectAll('*').remove();

    // Draw the links (flow lines)
    svg.append('g')
      .selectAll('path')
      .data(sankeyData.links)
      .enter()
      .append('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke-width', d => Math.max(1, d.width))
      .style('fill', 'none')
      .style('stroke', '#69b3a2')
      .style('opacity', 0.5);

    // Draw the nodes (rectangles)
    svg.append('g')
      .selectAll('rect')
      .data(sankeyData.nodes)
      .enter()
      .append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', '#69b3a2')
      .attr('stroke', '#000');

    // Add node labels
    svg.append('g')
      .selectAll('text')
      .data(sankeyData.nodes)
      .enter()
      .append('text')
      .attr('x', d => d.x0 - 6)
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .text(d => d.id)
      .filter(d => d.x0 < width / 2)
      .attr('x', d => d.x1 + 6)
      .attr('text-anchor', 'start');
  }, [data, width, height]);

  return (
    <svg ref={svgRef}></svg>
  );
};

const data = {
  nodes: [
    { id: "Stocks" },
    { id: "Positive" },
    { id: "Negative" },
    { id: "IREN" },
    { id: "WULF" },
    { id: "CORZ" },
    { id: "IBIT" },
    { id: "RIOT" },
    { id: "MARA" },
    { id: "BTBT" },
    { id: "CLSK" },
    { id: "COIN" },
    { id: "CIFR" },
    { id: "HIVE" },
    { id: "BITF" }
  ],
  links: [
    { source: "Stocks", target: "Positive", value: 2380.76 },
    { source: "Stocks", target: "Negative", value: 6754.46 },
    { source: "Positive", target: "IREN", value: 848.63 },
    { source: "Positive", target: "WULF", value: 1030.5 },
    { source: "Positive", target: "CORZ", value: 251.58 },
    { source: "Positive", target: "IBIT", value: 250.6 },
    { source: "Negative", target: "RIOT", value: 388.26 },
    { source: "Negative", target: "MARA", value: 1134.42 },
    { source: "Negative", target: "BTBT", value: 1420.16 },
    { source: "Negative", target: "CLSK", value: 1672.14 },
    { source: "Negative", target: "COIN", value: 680.36 },
    { source: "Negative", target: "CIFR", value: 725 },
    { source: "Negative", target: "HIVE", value: 286.12 },
    { source: "Negative", target: "BITF", value: 448 }
  ]
};


function Test() {
  return (
    <div>
      <h1>Stock Portfolio Sankey Diagram</h1>
      <SankeyChart data={data} />
    </div>
  );
}
export default Test;
