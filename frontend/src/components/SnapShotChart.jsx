import { CurrentStockChart } from "@/components/CurrentStockChart.jsx";
import GraphCardSkeleton from "@/Skeletons/GraphCardSkeleton";
import { transformSnapshotData } from "@/utils/dataProcessing";
import {  Card} from "@mui/material";
import { useFetcher } from "react-router-dom";
import React from "react";
import PortfolioStats from '@/components/PortfolioStats'

const SnapshotChart = React.memo(({
  incrementalChange,
  value,
  percentageChange,
  token,
  formattedDate,
  stockTickers,
  dailyTimeFrameData,
}) => {

  const transformedData = transformSnapshotData(dailyTimeFrameData);



  return (
    <div>
      <Card
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          margin: "auto",
          padding: "15px 15px",
          backgroundColor: "transparent",
        }}
      >
        <PortfolioStats formattedDate={formattedDate} incrementalChange={incrementalChange} percentageChange={percentageChange} stockTickers={stockTickers} token={token} value={value}/>
        <CurrentStockChart data={transformedData} enableAdvancedFeatures={true} />
      </Card>
    </div>
  );
});


export default SnapshotChart;