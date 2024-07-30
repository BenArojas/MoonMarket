import "@/styles/Treemap.css";
import { useTheme } from "@mui/material";
import * as d3 from "d3";
import { useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
// import { Typography } from '@mui/material';
import CustomTooltip from "@/components/CustomToolTip";
export const Treemap = ({ width, height, data }) => {
  const navigate = useNavigate();
  const tooltipRef = useRef(null);
  const theme = useTheme();
  const colors = {
    positive: theme.palette.primary.light,
    // positive: "#a4c969",
    negative: theme.palette.error.dark,
  };
  const hierarchy = useMemo(() => {
    return d3.hierarchy(data).sum((d) => d.value);
  }, [data]);

  // List of item of level 1 (just under root)
  const firstLevelGroups = hierarchy?.children?.map((child) => child.data.name);

  const colorScale = useMemo(() => {
    return d3
      .scaleOrdinal()
      .domain(firstLevelGroups || [])
      .range(
        firstLevelGroups?.map((name) =>
          name === "Positive" ? colors.positive : colors.negative
        )
      );
  }, [firstLevelGroups]);

  const root = useMemo(() => {
    const treeGenerator = d3.treemap().size([width, height]).padding(4);
    return treeGenerator(hierarchy);
  }, [hierarchy]);

  // const navigateToStockPage = (data) => {
  //   navigate(`/portfolio/${data.ticker}`, {
  //     state: {
  //       quantity: data.quantity,
  //       percentageOfPortfolio: data.percentageOfPortfolio,
  //     },
  //   });
  // };

  const allShapes = root.leaves().map((leaf, i) => {
    const parentName = leaf.parent?.data.name;
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
    } = leaf.data;

    return (
      <CustomTooltip
        percentageOfPortfolio={percentageOfPortfolio}
        quantity={quantity}
        ticker={ticker}
        last_price={last_price}
        avgSharePrice={avgSharePrice}
        value={value}
        key={i}
        name={name}
      >
        <Link to={{
          search: `selected=${ticker}`,
        }}>
          <g key={i} className="rectangle">
            <rect
              x={leaf.x0}
              y={leaf.y0}
              rx={4}
              width={leaf.x1 - leaf.x0}
              height={leaf.y1 - leaf.y0}
              stroke="transparent"
              fill={colorScale(parentName)}
              opacity={1}
              fill-opacity="0.3"
              // className={"opacity-80 hover:opacity-100"}
              style={{ "--stock-color": colorScale(parentName) }}
              // onClick={() => setShownStock(ticker)}
            />
            <text
              x={centerX}
              y={centerY - 6}
              fontSize={12}
              textAnchor="middle"
              alignmentBaseline="middle"
              fill="white"
              className="font-medium"
            >
              {leaf.data.ticker}
            </text>
            <text
              x={centerX}
              y={centerY + 6}
              fontSize={12}
              textAnchor="middle"
              alignmentBaseline="middle"
              fill="white"
              className="font-light"
            >
              {leaf.data.priceChangePercentage}%
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
