import LeaderboardCard from "@/components/leaderboards/LeaderboardCard";
import { leaderboardsStock } from "@/utils/dataProcessing";
import { Box } from "@mui/material";



interface TopLeadersProps{
  category: string;
  leaderboardsData: leaderboardsStock[]
}
function TopLeaders({ leaderboardsData, category }: TopLeadersProps) {
  const getChangeCount = (data: leaderboardsStock) => {
    switch (category) {
      case "percentage":
        return `${data.priceChangePercentage.toFixed(2)}%`;
      case "positionSize":
        return `${data.value.toFixed(2)}$`;
      default:
        return `${data.gainLoss.toFixed(2)}$`;
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