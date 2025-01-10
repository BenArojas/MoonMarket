import DonutSkeleton from "@/Skeletons/DonutSkeleton";
import TreeMapSkeleton from "@/Skeletons/TreeMapSkeleton";
import { CircularPacking } from "@/components/CircularPackingChart";
import { DonutChart } from "@/components/DonutChart";
import { Treemap } from "@/components/Treemap";
import Leaderboards from "@/components/Leaderboards";
import Sankey from "@/components/SankeyChart";
import { useMediaQuery, useTheme } from "@mui/material";



const skeletons = {
  DonutChart: DonutSkeleton,
  Treemap: TreeMapSkeleton,
  Circular: TreeMapSkeleton,
  TableGraph: TreeMapSkeleton,
  Leaderboards: TreeMapSkeleton,
  Sankey: TreeMapSkeleton,
};

const components = {
  DonutChart: DonutChart,
  Treemap: Treemap,
  Circular: CircularPacking,
  Leaderboards: Leaderboards,
  Sankey: Sankey
};

function DataGraph({ 
  isDataProcessed, 
  selectedGraph, 
  visualizationData,
  width,
  height,
  isDailyView
}) {
  const Skeleton = skeletons[selectedGraph] || TreeMapSkeleton;
  const GraphComponent = components[selectedGraph];

  if (!isDataProcessed) {
    return <Skeleton />;
  }

  if (!visualizationData || visualizationData.length === 0) {
    return <Skeleton />;
  }

  return GraphComponent ? (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
    <GraphComponent  
      data={visualizationData} 
      width={width}
      height={height}
      isDailyView={isDailyView}
    />
    </div>
  ) : null;
}
export default DataGraph;
