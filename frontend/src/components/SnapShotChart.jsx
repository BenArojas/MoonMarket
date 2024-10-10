import { CurrentStockChart } from "@/components/CurrentStockChart.jsx";
import { transformSnapshotData } from "@/utils/dataProcessing";
import { Card, Box } from "@mui/material";
import React from "react";
import PortfolioStats from "@/components/PortfolioStats";
import '@/styles/cardflipping.css';

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
       <div id="cards-wrapper">
        <div className="front-card">
        <Card
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "15px 15px",
            flexGrow: 1,
          }}
        >
          {dailyTimeFrameData.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                width: "100%",
              }}
            >
              Ai driven Data will be shown as activity will increase
            </Box>
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
                height={250}
              />
            </>
          )}
        </Card>
        </div>
        <div className="back-card">
          <p>get</p>
        </div>
       </div>
    );
  }
);

export default SnapshotChart;
