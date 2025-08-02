import CustomTooltip from "@/pages/Portfolio/CustomToolTip";
import "@/styles/Treemap.css";
import { formatNumber, ProcessedStockData, TreemapData } from "@/utils/dataProcessing";
import { useMediaQuery, useTheme } from "@mui/material";
import * as d3 from "d3";
import { useMemo } from "react";
import { Link } from "react-router-dom";

interface TreemapProps {
  width: number;
  height: number;
  isDailyView: boolean;
  data: TreemapData;
}

export const Treemap = ({ width, height, data, isDailyView }: TreemapProps) => {
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const hierarchy = useMemo(() => {
    return d3
      .hierarchy(data)
      .sum((d: any) => d.value || 0)
      .sort((a: d3.HierarchyNode<any>, b: d3.HierarchyNode<any>) => {
        const valueA = a.value ?? 0;
        const valueB = b.value ?? 0;
        return valueB - valueA;
      });
  }, [data]);

  // Create a color scale based on priceChangePercentage
  const getColor = (priceChangePercentage: number): string => {
    if (isDailyView) {
      // Daily view typically has smaller percentage changes
      if (priceChangePercentage > 5) return theme.palette.primary.light;
      if (priceChangePercentage > 2) return theme.palette.primary.main;
      if (priceChangePercentage > 0) return theme.palette.primary.dark;
      if (priceChangePercentage > -2) return theme.palette.error.light;
      if (priceChangePercentage > -5) return theme.palette.error.main;
      return theme.palette.error.dark;
    } else {
      // Original color scale for total gain/loss
      if (priceChangePercentage > 40) return theme.palette.primary.light;
      if (priceChangePercentage > 15) return theme.palette.primary.main;
      if (priceChangePercentage > 0) return theme.palette.primary.dark;
      if (priceChangePercentage > -15) return theme.palette.error.light;
      if (priceChangePercentage > -40) return theme.palette.error.main;
      return theme.palette.error.dark;
    }
  };

  const root = useMemo(() => {
    const treeGenerator = d3.treemap<any>().size([width, height]).padding(4);
    return treeGenerator(hierarchy);
  }, [hierarchy, width, height]);

  const allShapes = root.leaves().map((leaf, i) => {
    const centerX = (leaf.x0 + leaf.x1) / 2;
    const centerY = (leaf.y0 + leaf.y1) / 2;

    const {
      ticker,
      quantity,
      percentageOfPortfolio,
      avgSharePrice,
      value,
      last_price,
      name,
      priceChangePercentage,
      
    } = leaf.data as ProcessedStockData;

    const fillColor = getColor(priceChangePercentage);

    const content = (
      <Link
        to={{
          search: `selected=${ticker}`,
        }}
      >
        <g className="rectangle">
          <rect
            x={leaf.x0}
            y={leaf.y0}
            rx={4}
            width={leaf.x1 - leaf.x0}
            height={leaf.y1 - leaf.y0}
            stroke="transparent"
            fill={fillColor}
            opacity={1}
            fillOpacity="0.3"
            style={{ "--stock-color": fillColor } as React.CSSProperties}
          />
          <text
            x={centerX}
            y={centerY - 6}
            fontSize={12}
            textAnchor="middle"
            alignmentBaseline="middle"
            fill={theme.palette.text.primary}
            className="font-medium"
          >
            {ticker}
          </text>
          <text
            x={centerX}
            y={centerY + 6}
            fontSize={12}
            textAnchor="middle"
            alignmentBaseline="middle"
            fill={theme.palette.text.primary}
            className="font-bold"
          >
            {formatNumber(priceChangePercentage, { suffix: '%', maximumFractionDigits: 2 })}
          </text>
        </g>
      </Link>
    );

    return isMobileScreen ? (
      <g key={i}>{content}</g>
    ) : (
      <CustomTooltip
        key={i}
        percentageOfPortfolio={percentageOfPortfolio || 0}
        quantity={quantity}
        last_price={last_price}
        avgSharePrice={avgSharePrice}
        value={value}
        name={name}
      >
        {content}
      </CustomTooltip>
    );
  });

  return (
    <svg width={width} height={height} className="container">
      {allShapes}
    </svg>
  );
};