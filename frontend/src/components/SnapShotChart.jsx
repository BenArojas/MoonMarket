import PortfolioValue from "@/components/AnimatedNumber";
import { LineChart } from "@/components/LineGraph";
import GraphCardSkeleton from "@/Skeletons/GraphCardSkeleton";
import SyncIcon from "@mui/icons-material/Sync";
import { Box, Card, Stack, Typography } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useMemo } from "react";
import { useFetcher } from "react-router-dom";
import { transformSnapshotData } from "@/utils/dataProcessing";
import { CurrentStockChart } from "@/components/CurrentStockChart.jsx";

export const SnapshotChart = ({
  width,
  height,
  incrementalChange,
  value,
  percentageChange,
  token,
  formattedDate,
  stockTickers,
  dailyTimeFrameData,
}) => {
  const fetcher = useFetcher();
  const trendColor = percentageChange > 0 ? "primary" : "error";
  const transformedData = transformSnapshotData(dailyTimeFrameData);

  const chartData = useMemo(() => {
    if (dailyTimeFrameData == null) {
      return [];
    }
    return dailyTimeFrameData.slice(0, 6).reverse();
  }, [dailyTimeFrameData]);

  return (
    <div>
      {incrementalChange ? (
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
          <Box
            className="stats"
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              p: 1,
            }}
          >
            <Stack>
              <Typography variant="h5">Portfolio Value</Typography>
              <PortfolioValue value={value} />
            </Stack>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                gap: 2,
                alignItems: "center",
                ml: "auto",
              }}
            >
              <Box sx={{ display: "flex" }}>
                <Typography color={trendColor}>
                  {percentageChange > 0 ? <ArrowUp /> : <ArrowDown />}
                </Typography>
                <Typography
                  variant="body1"
                  color={trendColor}
                  sx={{ fontWeight: "bold" }}
                >
                  {percentageChange.toFixed(2).toLocaleString("en-US")}%
                </Typography>
              </Box>

              <Typography
                variant="body1"
                color={trendColor}
                sx={{ fontWeight: "bold" }}
              >
                {incrementalChange.toLocaleString("en-US")}$
              </Typography>
              {value === 0 ? null : (
                <fetcher.Form method="post">
                  <input
                    type="hidden"
                    name="tickers"
                    value={stockTickers.join(",")}
                  />
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="value" value={value} />
                  <Tooltip
                    title={`last updated at: ${formattedDate}. Click to refresh Stocks price`}
                    placement="top"
                  >
                    <IconButton type="submit" sx={{ shrink: 0 }}>
                      <SyncIcon />
                    </IconButton>
                  </Tooltip>
                </fetcher.Form>
              )}
            </Box>
          </Box>
          {/* {chartData.length === 0 ? null : (
            <LineChart width={width} height={height} data={chartData} />
          )} */}
          <CurrentStockChart data={transformedData} />
        </Card>
      ) : (
        <GraphCardSkeleton />
      )}
    </div>
  );
};
