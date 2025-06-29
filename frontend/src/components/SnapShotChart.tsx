import { Card, Skeleton, useMediaQuery, useTheme } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { fetchPerformance } from "@/api/user";
import PortfolioStats from "@/components/PortfolioStats";
import NavChartLW from "./NavChartLW";
import CumulativeChartLW from "./CumulativeChartLW";
import MonthlyBarChartLW from "./MonthlyBarChartLW";

/* ─── helper types ─────────────────────────────────────────────── */
type CardId = "main" | "left" | "right";
type Role = "front" | "left" | "right";

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
interface SnapshotChartProps {
  loadingAI: boolean;
  fetchInsights: () => void;
}

const SnapshotChart = React.memo(
  ({ fetchInsights, loadingAI }: SnapshotChartProps) => {
    /* 1️⃣  ALL hooks come first, unconditionally */
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("xl"));

    const [selectedPeriod, setSelectedPeriod] = useState("1Y");
    const [front, setFront] = useState<CardId>("main");

    const { data, isLoading, error } = useQuery({
      queryKey: ["performance", selectedPeriod],
      queryFn: () => fetchPerformance(selectedPeriod),
    });


    // 1️⃣ ─ Loading / error gating first ---------------------------------
    if (isLoading) {
      return (
        <div className="grid w-full place-items-center" style={{ height: 380 }}>
          <Skeleton variant="rectangular" width="80%" height="90%" />
        </div>
      );
    }
    if (error) {
      return <p className="text-red-600">Error: {error.message}</p>;
    }

    if (!data) {
      // still undefined or failed JSON shape
      return <p>No performance data.</p>;
    }

    /* 2️⃣  helpers (pure functions, no hooks) */
    const roleOf = (id: CardId): Role => {
      switch (front) {
        // If the 'main' card is at the front...
        case "main":
          // ...then the card with the id 'main' has the 'front' role.
          // The other cards ('left', 'right') have roles that match their ids.
          return id === "main" ? "front" : id; // ✅ Corrected line

        // This logic remains correct
        case "left":
          return id === "left" ? "front" : id === "main" ? "right" : "left";

        // This logic also remains correct
        case "right":
          return id === "right" ? "front" : id === "main" ? "left" : "right";
      }
    };

    // The transform values are now simpler because the parent grid handles centering.
    // We use values like 85% to move the card relative to its own size,
    // creating the "peek" effect.
    const transform = {
      front: "translate-x-0     scale-100 rotate-0  z-30",
      left: "-translate-x-[20%] scale-95 -rotate-3 z-20", // ← change here
      right: " translate-x-[20%] scale-95  rotate-3  z-20", // ← and here
    };

    const cards = [
      { id: 'left', chart: <NavChartLW  dates={data.nav.dates}  values={data.nav.navs} /> },
      { id: 'main', chart: <CumulativeChartLW dates={data.cps.dates} values={data.cps.returns} /> },
      { id: 'right', chart: <MonthlyBarChartLW dates={data.tpps.dates} values={data.tpps.returns} /> },
    ] satisfies { id: CardId; chart: JSX.Element }[];

    /* 3️⃣  render — never exits early, so hook count is stable */
    return (
      // Use a Grid container to center and stack the cards
      <div className="grid w-full place-items-center" style={{ height: 380 }}>
        {
          cards.map(({ id, chart }) => {
            const role = roleOf(id);
            const active = role === "front";

            return (
              // Each card is placed in the same grid cell to stack them.
              // Transitions and transforms are applied for the carousel effect.
              <div
                key={id}
                className={`row-start-1 col-start-1 w-4/5 h-[95%] transition-transform duration-500 ease-in-out
                          ${transform[role]} ${
                  !active ? "cursor-pointer" : ""
                }`}
                style={{ transformOrigin: "center center", perspective: 2000 }}
                onClick={() => !active && setFront(id)} // Only allow clicking back cards
              >
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: isSmallScreen ? 2 : 4,
                    p: 2,
                    // The card content (text, charts) is hidden on the back cards for a cleaner look.
                    filter: active ? "none" : "brightness(0.8)",
                    overflow: "hidden", // Ensures content doesn't spill out during transforms
                    boxShadow: active
                      ? "0 10px 30px -5px rgba(0,0,0,.35)"
                      : "0 25px 30px -15px rgba(0,0,0,.4)",
                    transition: "box-shadow .3s, filter .3s",
                  }}
                >
                  {/* To prevent interaction and improve aesthetics, you might want to conditionally render the content or overlay it */}
                  <div>
                    <PortfolioStats
                      fetchInsights={fetchInsights}
                      loadingAI={loadingAI}
                      handlePeriodChange={setSelectedPeriod}
                      selectedPeriod={selectedPeriod}
                    />
                    {chart}
                  </div>
                </Card>
              </div>
            );
          })}

      </div>
    );
  }
);

export default SnapshotChart;
