import { fetchPerformance } from "@/api/user";
import PortfolioStats from "@/pages/Portfolio/PortfolioStats";
import GraphSkeleton from "@/Skeletons/GraphSkeleton";
import { Card, useMediaQuery, useTheme } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import CumulativeChartLW from "../../components/CumulativeChartLW";
import MonthlyBarChartLW from "../../components/charts/MonthlyBarChartLW";
import MultiSeriesLineLw from "../../components/MultiSeriesLineLw";
import NavChartLW from "../../components/NavChartLW";

/* ─── helper functions ─────────────────────────────────────────────── */
export const fmtDate = (raw: string) => {
  // raw "20230512" ▸ "12 May 23"
  if (raw.length === 8) {
    const d = new Date(
      Number(raw.slice(0, 4)),
      Number(raw.slice(4, 6)) - 1,
      Number(raw.slice(6, 8))
    );
    return d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  }
  // raw "202305" ▸ "May 23"
  if (raw.length === 6) {
    const d = new Date(Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1);
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return raw;
};

export const fmtMoney = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

export const fmtPct = (v: number) => `${(v * 100).toFixed(2)} %`;

export const palette = {
  pos: "#4caf50",
  neg: "#e53935",
  line: "#1976d2",
};

/* ─── component ────────────────────────────────────────────────── */
interface PerformanceCardsProps {
  loadingAI: boolean;
  fetchInsights: () => void;
}

const PerformanceCards = React.memo(
  ({ fetchInsights, loadingAI }: PerformanceCardsProps) => {
    /* 1️⃣  ALL hooks come first, unconditionally */
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("xl"));
    const [selectedPeriod, setSelectedPeriod] = useState("1Y");
    const [activeCardIndex, setActiveCardIndex] = useState(0);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const { data, isLoading, error } = useQuery({
      queryKey: ["performance", selectedPeriod],
      queryFn: () => fetchPerformance(selectedPeriod),
    });

    // 1️⃣ ─ Loading / error gating is now simpler
    if (isLoading) {
      return <GraphSkeleton height={350} />;
    }
    if (error) {
      return <p className="text-red-600">Error: {error.message}</p>;
    }
    if (!data) {
      return <p>No performance data.</p>;
    }

    /* 2️⃣  Chart configurations */
    const chartConfigs = useMemo(() => [
      {
        title: "Portfolio Performance",
        chart: <CumulativeChartLW dates={data.cps.dates} values={data.cps.returns} />,
      },
      {
        title: "Multi-Series Analysis",
        chart: <MultiSeriesLineLw portfolioSeries={data.cps} period={selectedPeriod} />,
      },
      {
        title: "Monthly Returns",
        chart: <MonthlyBarChartLW dates={data.tpps.dates} values={data.tpps.returns} />,
      },
      {
        title: "Additional Analytics",
        chart: <NavChartLW dates={data.nav.dates} values={data.nav.navs} />,
      },
    ], [data, selectedPeriod]); // Dependencies for the memoization

    const handleCardClick = (index: number) => {
      if (index !== activeCardIndex) {
        setActiveCardIndex(index);
      }
    };

    /* 3️⃣  render */
    return (
      <div className="relative w-full overflow-hidden" style={{ height: 370 }}>
        {chartConfigs.map((config, index) => {
          const isActive = index === activeCardIndex;
          const isHovered = hoveredIndex === index;
          
          // Calculate positioning - deck-like stacking
          let translateX = 0;
          let stackPosition = 0;
          
          if (!isActive) {
            // Get all non-active cards and sort them by original index
            const nonActiveCards = chartConfigs
              .map((_, i) => i)
              .filter(i => i !== activeCardIndex)
              .sort((a, b) => a - b);
            
            stackPosition = nonActiveCards.indexOf(index);
            // Cards are stacked with minimal offset - like a deck
            translateX = 40 + stackPosition * 25; // Small offset to show card edges
          }
          
          const translateY = isActive ? 0 : stackPosition * 5 + (isHovered ? -12 : 0); // Slight cascade + hover
          const scale = isActive ? 1 : 0.98; // Minimal scaling
          const rotation = isActive ? 0 : stackPosition * 0.5; // Very subtle rotation
          const zIndex = isActive ? 50 : 40 - stackPosition;

          return (
            <div
              key={index}
              className={`absolute top-0 left-0 w-[85%] h-[95%] transition-all duration-2500 ease-out ${
                !isActive ? "cursor-pointer hover:brightness-150" : ""
              }`}
              style={{
                transform: `translateX(${translateX}px) translateY(${translateY}px) scale(${scale}) rotate(${rotation}deg)`,
                zIndex,
                transformOrigin: "left center",
              }}
              onClick={() => handleCardClick(index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: isSmallScreen ? 2 : 4,
                  p: 2,
                  filter: isActive ? "none" : "brightness(0.85)",
                  overflow: "hidden",
                  boxShadow: isActive
                    ? "0 20px 40px -10px rgba(0,0,0,.25)"
                    : isHovered
                    ? "0 15px 30px -5px rgba(0,0,0,.3)"
                    : "0 8px 20px -5px rgba(0,0,0,.2)",
                  transition: "all 0.3s ease",
                  border: isActive ? `2px solid ${theme.palette.primary.main}` : "2px solid rgba(0,0,0,0.4)",
                }}
              >
                <div>
                  <PortfolioStats
                    fetchInsights={fetchInsights}
                    loadingAI={loadingAI}
                    handlePeriodChange={setSelectedPeriod}
                    selectedPeriod={selectedPeriod}
                  />
                  {config.chart}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    );
  }
);

export default PerformanceCards;