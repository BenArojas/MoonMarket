import AiInsightsDialog from "@/components/AiInsightsDialog";
import { useStockStore } from "@/stores/stockStore";
import {
    Box,
    IconButton,
    MenuItem,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { Brain } from "lucide-react";
import { useState } from "react";

const mockPortfolioData = [
  { ticker: "AAPL", value: 15000 },
  { ticker: "TSLA", value: 10000 },
];


interface PortfolioStatsProps {
  handlePeriodChange: (period: string) => void;
  selectedPeriod: string;
}
function PortfolioStats({
  handlePeriodChange,
  selectedPeriod,
}: PortfolioStatsProps) {
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const areAiFeaturesEnabled = useStockStore((s) => s.areAiFeaturesEnabled);
  
  return (
    <Box
      className="stats"
      sx={{
        display: "flex",
        flexDirection: isMobileScreen ? "column" : "row",
        alignItems: "center",
        p: 1,
      }}
    >
      <Typography variant={"h5"}>Portfolio Performance</Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: 2,
          alignItems: "center",
          ml: "auto",
        }}
      >
        <TextField
          select
          size="small"
          label="Selected Period"
          value={selectedPeriod}
          onChange={(e) => handlePeriodChange(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="1D">Last Day</MenuItem>
          <MenuItem value="7D"> 7 Days</MenuItem>
          <MenuItem value="MTD">Month to date</MenuItem>
          <MenuItem value="1M">1 Month</MenuItem>
          <MenuItem value="YTD">Year to date </MenuItem>
          <MenuItem value="1Y">1 Year</MenuItem>
        </TextField>

        <Tooltip
              title={areAiFeaturesEnabled ? "Get AI Insights" : "AI features are not configured by the administrator."}
              placement="top"
            >
              <span>
                <IconButton
                  onClick={() => setIsAiDialogOpen(true)}
                  disabled={!areAiFeaturesEnabled}
                >
                  <Brain />
                </IconButton>
              </span>
            </Tooltip>
            {areAiFeaturesEnabled && (
        <AiInsightsDialog
          open={isAiDialogOpen}
          onClose={() => setIsAiDialogOpen(false)}
          portfolioData={mockPortfolioData} // <-- Pass real portfolio data here
        />
      )}
      </Box>
    </Box>
  );
}

export default PortfolioStats;
