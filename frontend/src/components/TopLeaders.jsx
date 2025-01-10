import LeaderboardCard from "@/components/LeaderboardCard";
import { Box } from "@mui/material";
import * as React from 'react';

function TopLeaders({ leaderboardsData, category }) {
  const getChangeCount = (data) => {
    switch (category) {
      case "percentage":
        return `${data.priceChangePercentage}%`;
      case "positionSize":
        return `${data.value}$`;
      default:
        return `${data.gainLoss}$`;
    }
  };

  const sortedData = [...leaderboardsData].sort((a, b) => {
    const aValue = category === "percentage" ? a.priceChangePercentage : category === "positionSize" ? a.value : a.gainLoss;
    const bValue = category === "percentage" ? b.priceChangePercentage : category === "positionSize" ? b.value : b.gainLoss;
    return bValue - aValue;
  });

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
          justifyContent: "center",
          alignItems: "flex-end",
        }}
      >
        {sortedData.slice(0, 3).map((data, index) => (
          <Box
            key={data.ticker}
            sx={{
              order: index === 0 ? 2 : index === 1 ? 1 : 3,
              transform: index === 0 ? 'scale(1.02)' : 'none',
              zIndex: index === 0 ? 2 : 1,
              marginBottom: index === 0 ? '20px' : '0',
            }}
          >
            <LeaderboardCard
              stock={data}
              Number={index + 1}
              changeCount={getChangeCount(data)}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default TopLeaders;