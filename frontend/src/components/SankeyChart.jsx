import { sankey, sankeyCenter, sankeyLinkHorizontal } from "d3-sankey";
import { useTheme } from "@mui/material";

const MARGIN_Y = 25;
const MARGIN_X = 5;

const Sankey = ({ width, height, data }) => {
    const theme = useTheme();
    const sankeyGenerator = sankey()
      .nodeWidth(26)
      .nodePadding(29)
      .extent([
        [MARGIN_X, MARGIN_Y],
        [width - MARGIN_X, height - MARGIN_Y],
      ])
      .nodeId((node) => node.id)
      .nodeAlign(sankeyCenter);
  
    const { nodes, links } = sankeyGenerator(data);
  
    const formatValue = (value) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
    };
  
    const allNodes = nodes.map((node) => {
        const isPosNeg = node.id === "Positive" || node.id === "Negative";
      
      // Reverse the x0 and x1 for the nodes to flip them
      const x0 = width - node.x1;
      const x1 = width - node.x0;
  
      return (
        <g key={node.index}>
          <rect
            height={node.y1 - node.y0}
            width={sankeyGenerator.nodeWidth()}
            x={x0}
            y={node.y0}
            stroke={"black"}
            fill={node.color}
            fillOpacity={0.8}
            rx={0.9}
          />
          <text
            x={x0 < width / 2 ? x1 + 6 : x0 - 6}
            y={(node.y1 + node.y0) / 2}
            dy="0.35em"
            textAnchor={x0 < width / 2 ? "start" : "end"}
            fontSize={14}
            fill={theme.palette.text.primary}
          >
            {node.id} ({ formatValue(node.value)})
          </text>
          { !isPosNeg && (
            <text
              x={x0 < width / 2 ? x1 + 6 : x0 - 6}
              y={(node.y1 + node.y0) / 2 + 14}
              dy="0.35em"
              textAnchor={x0 < width / 2 ? "start" : "end"}
              fontSize={12}
              fill={theme.palette.text.primary}
            >
              {node.percentageChange > 0 ? "+" : ""}{node.percentageChange}%
            </text>
          )}
        </g>
      );
    });
  
    const allLinks = links.map((link, i) => {
      const linkGenerator = sankeyLinkHorizontal();
  
      // Reverse the link path by swapping the source and target x values
      const reversedLink = { ...link, source: { ...link.source, x0: width - link.source.x1, x1: width - link.source.x0 }, target: { ...link.target, x0: width - link.target.x1, x1: width - link.target.x0 } };
      const path = linkGenerator(reversedLink);
  
      return (
        <path
          key={i}
          d={path}
          stroke={link.source.color}
          fill="none"
          strokeOpacity={0.3}
          strokeWidth={link.width}
        />
      );
    });
  
    return (
      <div>
        <svg width={width} height={height}>
          {allLinks}
          {allNodes}
        </svg>
      </div>
    );
  };
  

  export default Sankey;