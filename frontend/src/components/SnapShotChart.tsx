import { updateStockPrices } from "@/api/stock";
import { AreaChart } from "@/components/CurrentStockChart";
import PerformanceChart from "@/components/PerformanceGraph";
import PortfolioStats from "@/components/PortfolioStats";
import { calculatePerformanceData, SnapshotData, transformSnapshotData } from "@/utils/dataProcessing";
import { Box, Card, useMediaQuery, useTheme } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";

interface SnapshotChartProps {
  formattedDate: string
  incrementalChange: number
  value: number
  percentageChange: number
  stockTickers: string[]
  dailyTimeFrameData: SnapshotData[]
  loadingAI: boolean
  fetchInsights: () => void
}
const SnapshotChart = React.memo(
  ({
    incrementalChange,
    value,
    percentageChange,
    formattedDate,
    stockTickers,
    dailyTimeFrameData,
    fetchInsights,
    loadingAI
  }: SnapshotChartProps) => {

    const [isFlipped, setIsFlipped] = useState(false);
    const areaChartData = transformSnapshotData(dailyTimeFrameData);
    const performanceChartData = calculatePerformanceData(dailyTimeFrameData)
    const trend = percentageChange > 0 ? "positive" : "negative";
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('xl'));
    const queryClient = useQueryClient();


    const updateStockPricesMutation = useMutation({
      mutationFn: (tickers: string[]) => updateStockPrices(tickers),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['holdingsData'] });
      },
      onError: () => {
        console.log("failed to update stock prices")
      }
    });


    return (
      <div className="relative w-full" style={{ height: 400 }}>
        <div className="relative w-full h-full" style={{ perspective: '2000px' }}>
          {/* Back Card (Additional Information) */}
          <div
            className={`absolute w-[90%] h-full transition-all duration-500 ease-in-out ${isFlipped
              ? 'left-0 z-20 translate-y-0 rotate-0'
              : 'left-[10%] z-10 translate-y-2 rotate-2 cursor-pointer hover:translate-y-[-2px]'
              }`}
            onClick={() => !isFlipped && setIsFlipped(true)}
          >
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: isSmallScreen ? 2 : 4,
                padding: '15px 15px',
                boxShadow: isFlipped
                  ? '0 10px 30px -5px rgba(0, 0, 0, 0.3)'
                  : '0 25px 30px -15px rgba(0, 0, 0, 0.4)'
              }}
            >
              <PortfolioStats
                trend={trend}
                formattedDate={formattedDate}
                incrementalChange={incrementalChange}
                percentageChange={percentageChange}
                stockTickers={stockTickers}
                value={value}
                updateStockPricesMutation={updateStockPricesMutation}
                fetchInsights={fetchInsights}
                loadingAI={loadingAI}
              />
              <AreaChart
                data={areaChartData}
                enableAdvancedFeatures={true}
                trend={trend}
                height={250}
              />
            </Card>
          </div>

          {/* Front Card (Main Content) */}
          <div
            className={`absolute w-[90%] h-full transition-all duration-500 ease-in-out ${isFlipped
              ? 'left-[10%] z-10 translate-y-2 rotate-2 cursor-pointer hover:translate-y-[-2px]'
              : 'left-0 z-20 translate-y-0 rotate-0'
              }`}
            onClick={() => isFlipped && setIsFlipped(false)}
          >
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: isSmallScreen ? 2 : 4,
                padding: '15px 15px',
                boxShadow: !isFlipped
                  ? '0 10px 30px -5px rgba(0, 0, 0, 0.3)'
                  : '0 25px 30px -15px rgba(0, 0, 0, 0.4)'
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
                    updateStockPricesMutation={updateStockPricesMutation}
                    fetchInsights={fetchInsights}
                    loadingAI={loadingAI}
                  />

                  <PerformanceChart data={performanceChartData} />
                </>
              )}
            </Card>
          </div>
        </div>

        {/* Optional: Ground shadow */}
        <div className="absolute inset-0 bg-black/5 -z-10 translate-y-4 blur-xl rounded-full" />
      </div>
    );
  }
);

export default SnapshotChart;