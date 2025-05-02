import { sankey, sankeyCenter, SankeyLink, sankeyLinkHorizontal, SankeyNode } from "d3-sankey";
import { useTheme } from "@mui/material";
import { teal, red } from '@mui/material/colors';
import { scaleLinear } from 'd3-scale';

// --- Input Types for d3-sankey ---
// Represents the structure of nodes BEFORE d3-sankey processing
export interface SankeyInputNode {
  id: string;
  color?: string;
  value?: number;
  name?: string;
  percentageChange?: string;
}

// Represents the structure of links BEFORE d3-sankey processing
export interface SankeyInputLink {
  source: string; // Node ID
  target: string; // Node ID
  value: number;
  // NO other custom properties specific to the link object itself
}

// --- Output Types from d3-sankey ---

// Forward declaration for ProcessedSankeyLink to be used in ProcessedSankeyNode
interface ProcessedSankeyLinkPlaceholder {}

// Extends d3-sankey's SankeyNode with our custom properties (N = SankeyInputNode)
// and specifies that links have no extra custom properties (L = {})
export interface ProcessedSankeyNode extends SankeyNode<SankeyInputNode, {}> {
  // Properties from SankeyInputNode that persist
  id: string; // Ensure id remains string
  color?: string;
  name?: string;
  percentageChange?: string;
  // value is already defined in SankeyNode as number | undefined

  // Override source/target links to use the final ProcessedSankeyLink type
  sourceLinks?: ProcessedSankeyLink[];
  targetLinks?: ProcessedSankeyLink[];
}

// Extends d3-sankey's SankeyLink with our custom node properties (N = SankeyInputNode)
// and specifies that links have no extra custom properties (L = {})
export interface ProcessedSankeyLink extends SankeyLink<SankeyInputNode, {}>, ProcessedSankeyLinkPlaceholder {
  // D3 replaces source/target strings with references to ProcessedSankeyNode objects.
  // We override source/target to point to our specific ProcessedSankeyNode type.
  source: ProcessedSankeyNode;
  target: ProcessedSankeyNode;

  // value is required by our input and correctly included by SankeyLink
  value: number;

  // width, index, y0, y1 are inherited from SankeyLink<N, L>
  // width?: number;
  // index?: number;
  // y0?: number;
  // y1?: number;
}

// (Rest of the SankeyInputData, SankeyProps, Sankey component, processSankeyData function remains the same)
// Make sure the cast inside the Sankey component also reflects these types:
// const { nodes, links } = sankeyGenerator(data) as {
//      nodes: ProcessedSankeyNode[];
//      links: ProcessedSankeyLink[];
// };

export interface SankeyInputData {
  nodes: SankeyInputNode[];
  links: SankeyInputLink[];
}
// --- Component Props ---
interface SankeyProps {
  width: number;
  height: number;
  data: SankeyInputData; // Component receives the raw input data
}
// --- Constants ---
const MARGIN_Y = 25;
const MARGIN_X = 5;
const NODE_WIDTH = 26;
const NODE_PADDING = 29;

// --- Sankey Component ---
 const Sankey = ({ width, height, data }: SankeyProps) => {
  console.log("Input data:", data);
  const theme = useTheme();

  // Create color scales
  // Use Number() to ensure percentageChange is treated as a number for the domain
  const positiveColorScale = scaleLinear<string>() // Explicitly type the output range
    .domain([0, 100]) // Assuming percentageChange is between 0 and 100 for positive
    .range([teal[300], teal[800]]); // Use actual theme colors

  const negativeColorScale = scaleLinear<string>() // Explicitly type the output range
    .domain([-100, 0]) // Assuming percentageChange is between -100 and 0 for negative
    .range([red[900], red[300]]); // Use actual theme colors

  // Define the sankey generator with explicit types
  const sankeyGenerator = sankey<SankeyInputNode, SankeyInputLink>() // Specify input node/link types
    .nodeWidth(NODE_WIDTH)
    .nodePadding(NODE_PADDING)
    .extent([
      [MARGIN_X, MARGIN_Y],
      [width - MARGIN_X, height - MARGIN_Y],
    ])
    .nodeId((node) => node.id) // node here is SankeyInputNode
    .nodeAlign(sankeyCenter);

  // Process the data. The result will have ProcessedSankeyNode and ProcessedSankeyLink types
  // Although d3 mutates, it's safer to capture the return value
  // Note: d3-sankey types might require casting if generics aren't perfectly inferred
  const { nodes, links } = sankeyGenerator(data) as {
      nodes: ProcessedSankeyNode[];
      links: ProcessedSankeyLink[];
  }; // Cast to the processed types

  console.log("Processed nodes:", nodes);
  console.log("Processed links:", links);

  const formatValue = (value: number | undefined): string => {
      if (value === undefined) return ''; // Handle undefined value gracefully
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  // --- Render Nodes ---
  const allNodes = nodes.map((node) => { // node is ProcessedSankeyNode
    const isPosNeg = node.id === "Positive" || node.id === "Negative";
    const percentageNum = node.percentageChange ? parseFloat(node.percentageChange) : undefined;

    // Determine node color
    let nodeColor: string | undefined;
    if (isPosNeg) {
        // Use the predefined colors for Positive/Negative
        nodeColor = node.id === "Positive" ? teal[500] : red[500]; // Use actual colors
    } else if (percentageNum !== undefined && !isNaN(percentageNum)) {
        // Calculate color based on percentage change for other nodes
        nodeColor = percentageNum >= 0
            ? positiveColorScale(percentageNum)
            : negativeColorScale(percentageNum);
    } else {
        nodeColor = theme.palette.grey[500]; // Default color if no percentage
    }


    // Reverse the x0 and x1 for the nodes to flip them horizontally
    // Ensure x0 and x1 are defined (they should be after sankeyGenerator)
    const x0 = width - (node.x1 ?? 0);
    const x1 = width - (node.x0 ?? 0);
    const nodeHeight = (node.y1 ?? 0) - (node.y0 ?? 0); // Calculate height safely

    return (
      <g key={node.index ?? node.id}> {/* Use index if available, fallback to id */}
        <rect
          height={nodeHeight > 0 ? nodeHeight : 0} // Ensure height is non-negative
          width={sankeyGenerator.nodeWidth()}
          x={x0}
          y={node.y0 ?? 0}
          stroke={"black"}
          fill={nodeColor}
          fillOpacity={0.8}
          rx={0.9}
        />
        <text
          // Position text based on which side of the middle the node falls
          x={x0 < width / 2 ? x1 + 6 : x0 - 6}
          y={( (node.y1 ?? 0) + (node.y0 ?? 0) )/ 2}
          dy="0.35em"
          textAnchor={x0 < width / 2 ? "start" : "end"}
          fontSize={14}
          fontWeight="bold" // Make node ID bold
          fill={theme.palette.text.primary}
        >
          {/* Display name if available (for company nodes), otherwise ID */}
          {node.name ?? node.id} ({formatValue(node.value)})
        </text>
        {/* Conditionally render percentage change text only for non-Pos/Neg nodes */}
        {!isPosNeg && node.percentageChange !== undefined && (
          <text
            x={x0 < width / 2 ? x1 + 6 : x0 - 6}
            // Position percentage below the main label
            y={( (node.y1 ?? 0) + (node.y0 ?? 0)) / 2 + 14} // Adjust vertical offset
            dy="0.35em"
            textAnchor={x0 < width / 2 ? "start" : "end"}
            fontSize={12}
            fill={percentageNum !== undefined && percentageNum >= 0 ? teal[700] : red[700]} // Color based on sign
          >
            {/* Ensure a sign is always shown for percentage */}
            {percentageNum !== undefined && percentageNum > 0 ? "+" : ""}{node.percentageChange}%
          </text>
        )}
      </g>
    );
  });

  // --- Render Links ---
  const allLinks = links.map((link, i) => { // link is ProcessedSankeyLink
    const linkGenerator = sankeyLinkHorizontal<ProcessedSankeyNode, ProcessedSankeyLink>(); // Specify node/link types

    // Reverse the link path by swapping the source and target x values AFTER d3 processing
    // Create a temporary link object suitable for the reversed path generation
    // Note: d3 sankeyLinkHorizontal expects source/target to have x0, x1, y0, y1
    const reversedLink = {
        ...link,
        source: { ...link.source, x0: width - (link.source.x1 ?? 0), x1: width - (link.source.x0 ?? 0) },
        target: { ...link.target, x0: width - (link.target.x1 ?? 0), x1: width - (link.target.x0 ?? 0) }
    };

    // The path generator might need a slightly different type depending on strictness
    // Casting 'reversedLink' might be needed if type inference fails
    const path = linkGenerator(reversedLink as any); // Use 'as any' if type issues persist with path gen

    // Create a gradient for each link
    const gradientId = `gradient-${i}`;

    // Get source color: Check explicit color first, then calculate from percentage
    const sourcePercentage = link.source.percentageChange ? parseFloat(link.source.percentageChange) : undefined;
    const sourceColor = link.source.id === "Positive" ? teal[500] :
                      link.source.id === "Negative" ? red[500] :
                      (sourcePercentage !== undefined && !isNaN(sourcePercentage)
                        ? (sourcePercentage >= 0 ? positiveColorScale(sourcePercentage) : negativeColorScale(sourcePercentage))
                        : theme.palette.grey[500]); // Default

    // Get target color: Check explicit color first, then calculate from percentage
    const targetPercentage = link.target.percentageChange ? parseFloat(link.target.percentageChange) : undefined;
    const targetColor = link.target.id === "Positive" ? teal[500] :
                      link.target.id === "Negative" ? red[500] :
                      (targetPercentage !== undefined && !isNaN(targetPercentage)
                        ? (targetPercentage >= 0 ? positiveColorScale(targetPercentage) : negativeColorScale(targetPercentage))
                        : theme.palette.grey[500]); // Default


    return (
      <g key={`link-${link.index ?? i}`}> {/* Use index if available */}
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse"
            // Set gradient vector from source node center to target node center (approximately)
            // This ensures gradient direction follows the link flow visually after reversal
            x1={width - ((link.source.x0 ?? 0) + (link.source.x1 ?? 0)) / 2} // Reversed source x center
            y1={((link.source.y0 ?? 0) + (link.source.y1 ?? 0)) / 2} // Source y center
            x2={width - ((link.target.x0 ?? 0) + (link.target.x1 ?? 0)) / 2} // Reversed target x center
            y2={((link.target.y0 ?? 0) + (link.target.y1 ?? 0)) / 2} // Target y center
          >
            {/* Start with the *target* color because we reversed the flow visually */}
            <stop offset="0%" stopColor={targetColor} />
            {/* End with the *source* color */}
            <stop offset="100%" stopColor={sourceColor} />
          </linearGradient>
        </defs>
        <path
          d={path ?? ""} // Ensure path is not null/undefined
          stroke={`url(#${gradientId})`}
          fill="none"
          strokeOpacity={0.5} // Slightly increased opacity
          strokeWidth={link.width ?? 0} // Use calculated width, ensure non-negative
        />
      </g>
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

export default Sankey