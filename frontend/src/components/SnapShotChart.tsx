import { fetchPerformanceData } from "@/api/user";
import { AreaChart, ChartDataPoint } from "@/components/CurrentStockChart";
import PerformanceChart from "@/components/PerformanceGraph";
import PortfolioStats from "@/components/PortfolioStats";
import { Card, useMediaQuery, useTheme } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";

interface SnapshotChartProps {
  loadingAI: boolean;
  fetchInsights: () => void;
}
const SnapshotChart = React.memo(
  ({ fetchInsights, loadingAI }: SnapshotChartProps) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("xl"));

    const [selectedPeriod, setSelectedPeriod] = useState<string>("1Y"); // Default period

    const {
      data: chartData,
      isLoading,
      isError,
      error,
    } = useQuery<ChartDataPoint[], Error>({
      queryKey: ["accountPerformanceHistory", selectedPeriod],
      queryFn: () => fetchPerformanceData(selectedPeriod),
    });

    const handlePeriodChange = (newPeriod: string) => {
      setSelectedPeriod(newPeriod);
    };

    if (isLoading) return <p>Loading chart data...</p>;

    // Handle error state
    if (isError && error) {
      const errorMessage =
        (error as any)?.response?.data?.detail ||
        error.message ||
        "Failed to fetch chart data";
      return <p>Error loading chart data: {errorMessage}</p>;
    }


    if (!chartData || chartData.length === 0) {
      // If not loading and not an error, but no data, it means an empty response or the query hasn't run.
      // We can be more specific if needed based on other flags from useQuery like `isSuccess`.
      return <p>No performance data available for the selected period.</p>;
    }

    return (
      <div className="relative w-full" style={{ height: 380 }}>
        <div
          className="relative w-full h-full"
          style={{ perspective: "2000px" }}
        >
          {/* Back Card (Additional Information) */}
          <div
            className={`absolute w-[90%] h-full transition-all duration-500 ease-in-out ${
              isFlipped
                ? "left-0 z-20 translate-y-0 rotate-0"
                : "left-[10%] z-10 translate-y-2 rotate-2 cursor-pointer hover:translate-y-[-2px]"
            }`}
            onClick={() => !isFlipped && setIsFlipped(true)}
          >
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: isSmallScreen ? 2 : 4,
                padding: "15px 15px",
                boxShadow: isFlipped
                  ? "0 10px 30px -5px rgba(0, 0, 0, 0.3)"
                  : "0 25px 30px -15px rgba(0, 0, 0, 0.4)",
              }}
            >
              <PortfolioStats
                fetchInsights={fetchInsights}
                loadingAI={loadingAI}
                handlePeriodChange={handlePeriodChange}
                selectedPeriod={selectedPeriod}
              />
              <AreaChart
                data={chartData}
                enableAdvancedFeatures={true}
                trend={"positive"}
                height={250}
              />
            </Card>
          </div>

          {/* Front Card (Main Content) */}
          <div
            className={`absolute w-[90%] h-full transition-all duration-500 ease-in-out ${
              isFlipped
                ? "left-[10%] z-10 translate-y-2 rotate-2 cursor-pointer hover:translate-y-[-2px]"
                : "left-0 z-20 translate-y-0 rotate-0"
            }`}
            onClick={() => isFlipped && setIsFlipped(false)}
          >
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: isSmallScreen ? 2 : 4,
                padding: "15px 15px",
                boxShadow: !isFlipped
                  ? "0 10px 30px -5px rgba(0, 0, 0, 0.3)"
                  : "0 25px 30px -15px rgba(0, 0, 0, 0.4)",
              }}
            >
              <>
                <PortfolioStats
                  fetchInsights={fetchInsights}
                  loadingAI={loadingAI}
                  handlePeriodChange={handlePeriodChange}
                  selectedPeriod={selectedPeriod}
                />
                <PerformanceChart data={chartData} height={250} />
              </>
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
