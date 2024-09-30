import { CurrentStockChart } from "@/components/CurrentStockChart.jsx";
import GraphCardSkeleton from "@/Skeletons/GraphCardSkeleton";
import { transformSnapshotData } from "@/utils/dataProcessing";
import { Card } from "@mui/material";
import { useFetcher } from "react-router-dom";
import React from "react";
import PortfolioStats from "@/components/PortfolioStats";

const SnapshotChart = React.memo(
  ({
    incrementalChange,
    value,
    percentageChange,
    formattedDate,
    stockTickers,
    dailyTimeFrameData,
  }) => {
    const transformedData = transformSnapshotData(dailyTimeFrameData);
    const trend = percentageChange > 0 ? "positive" : "negative";

    return (
      // <div>
        <Card
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "15px 15px",
            flexGrow: 1
          }}
        >
          {dailyTimeFrameData.length === 0 ? (
            <div>Ai driven Data will be shown as activity will increase</div>
          ) : (
            <>
              <PortfolioStats
                trend={trend}
                formattedDate={formattedDate}
                incrementalChange={incrementalChange}
                percentageChange={percentageChange}
                stockTickers={stockTickers}
                value={value}
              />
              <CurrentStockChart
                data={transformedData}
                enableAdvancedFeatures={true}
                trend={trend}
                height={220}
              />
            </>
          )}
        </Card>
      // </div>
    );
  }
);

export default SnapshotChart;
