import LeaderboardCard from "@/components/LeaderboardCard";
import { Box } from "@mui/material";
import * as React from 'react';


function TopLeaders({ leaderboardsData, category }) {
  console.log(leaderboardsData)

  const renderLeaderboardCard = (index, position) => {
    if (leaderboardsData.length > index) {
      const data = leaderboardsData[index];
      return (
        <LeaderboardCard
          stock={data}
          Number={position}
          // ticker={data.ticker}
          changeCount={
            category === "percentage"
              ? data.priceChangePercentage + "%"
              : category === "positionSize"
              ? data.value + "$"
              : data.gainLoss + "$"
          }
        />
      );
    }
    return null;
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "inherit",
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        backgroundRepeat: "repeat",
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: 1,
        }}
      >
        {renderLeaderboardCard(1, 2)}
        {renderLeaderboardCard(0, 1)}
        {renderLeaderboardCard(2, 3)}
      </Box>
      
    </Box>
  );
}

export default TopLeaders;