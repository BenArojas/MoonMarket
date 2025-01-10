import "@/styles/Treemap.css";
import { useTheme, useMediaQuery } from "@mui/material";
import * as d3 from "d3";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import CustomTooltip from "@/components/CustomToolTip";
import { useStocksDailyData } from '@/hooks/useStocksDailyData';
import GraphSkeleton from "@/Skeletons/GraphSkeleton";
import TreeMapSkeleton from "@/Skeletons/TreeMapSkeleton";

export const Treemap = ({ width, height, data, isDailyView, }) => {
  const check = true
  const { data: dailyData, isLoading: isDailyDataLoading } = useStocksDailyData(data, isDailyView);

  const processedData = useMemo(() => {
    // If we're not in daily view or don't have daily data, return original data unchanged
    if (!isDailyView || !dailyData) return data;

    // Create a complete copy of the original data structure
    const newData = JSON.parse(JSON.stringify(data));

    // First pass: Update the priceChangePercentage values
    newData.children.forEach(group => {
      group.children.forEach(stock => {
        // Replace the original priceChangePercentage with daily percentage
        const dailyPercentage = dailyData[stock.ticker];
        stock.priceChangePercentage = dailyPercentage;
      });
    });

    // Get all stocks from both positive and negative groups
    const allStocks = newData.children.flatMap(group => group.children);

    // Split stocks into new positive and negative groups based on daily performance
    const positiveStocks = allStocks.filter(stock => stock.priceChangePercentage > 0);
    const negativeStocks = allStocks.filter(stock => stock.priceChangePercentage <= 0);

    // Reconstruct the children array with the same structure
    newData.children = [
      { name: "Positive", value: 0, children: positiveStocks },
      { name: "Negative", value: 0, children: negativeStocks }
    ];

    return newData;
  }, [data, dailyData, isDailyView]);


  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const hierarchy = useMemo(() => {
    return d3.hierarchy(processedData)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);
  }, [processedData]);

  // Create a color scale based on priceChangePercentage
  const getColor = (priceChangePercentage) => {
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
    const treeGenerator = d3.treemap().size([width, height]).padding(4);
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
      priceChangePercentage
    } = leaf.data;

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
            style={{ "--stock-color": fillColor }}
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
            {priceChangePercentage}%
          </text>
        </g>
      </Link>
    );

    return isMobileScreen ? (
      <g key={i}>{content}</g>
    ) : (
      <CustomTooltip
        key={i}
        percentageOfPortfolio={percentageOfPortfolio}
        quantity={quantity}
        ticker={ticker}
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
    <div>
      {isDailyDataLoading || check ? <div style={{
          width: width,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <TreeMapSkeleton />
      </div> :
        <svg width={width} height={height} className="container">
          {allShapes}
        </svg>}
    </div>
  );
};