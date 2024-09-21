import "@/styles/Treemap.css";
import { useTheme } from "@mui/material";
import * as d3 from "d3";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import CustomTooltip from "@/components/CustomToolTip";

export const Treemap = ({ width, height, data }) => {
  const theme = useTheme();
  const hierarchy = useMemo(() => {
    return d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Create a color scale based on priceChangePercentage
  const getColor = (priceChangePercentage) => {
    if (priceChangePercentage > 40) return theme.palette.primary.light;
    if (priceChangePercentage > 15) return theme.palette.primary.main;
    if (priceChangePercentage > 0) return theme.palette.primary.dark;
    if (priceChangePercentage > -15) return theme.palette.error.light;
    if (priceChangePercentage > -40) return theme.palette.error.main;
    return theme.palette.error.dark;
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
    const textColor = priceChangePercentage >= 0 ? theme.palette.primary.dark : theme.palette.error.dark;

    return (
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
        <Link to={{
          search: `selected=${ticker}`,
        }}>
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
      </CustomTooltip>
    );
  });

  return (
    <div>
      <svg width={width} height={height} className="container">
        {allShapes}
      </svg>
    </div>
  );
};