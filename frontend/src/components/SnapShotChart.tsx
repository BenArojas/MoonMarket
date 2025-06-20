import {
  Card, Skeleton, useMediaQuery, useTheme,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';

import { fetchPerformanceData } from '@/api/user';
import PortfolioStats from '@/components/PortfolioStats';
import PerformanceChart from '@/components/PerformanceGraph';
import { AreaChart, ChartDataPoint } from '@/components/CurrentStockChart';

/* ─── helper types ─────────────────────────────────────────────── */
type CardId = 'main' | 'left' | 'right';
type Role   = 'front' | 'left' | 'right';

/* ─── component ────────────────────────────────────────────────── */
interface SnapshotChartProps {
  loadingAI: boolean;
  fetchInsights: () => void;
}

const SnapshotChart = React.memo(({ fetchInsights, loadingAI }: SnapshotChartProps) => {
  /* 1️⃣  ALL hooks come first, unconditionally */
  const theme         = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('xl'));

  const [selectedPeriod, setSelectedPeriod] = useState('1Y');
  const [front,          setFront]          = useState<CardId>('main');

  const {
    data       : chartData = [],
    isLoading,
    error,
  } = useQuery<ChartDataPoint[], Error>({
    queryKey: ['accountPerformanceHistory', selectedPeriod],
    queryFn : () => fetchPerformanceData(selectedPeriod),
  });

  /* 2️⃣  helpers (pure functions, no hooks) */
  const roleOf = (id: CardId): Role => {
    switch (front) {
      // If the 'main' card is at the front...
      case 'main':
        // ...then the card with the id 'main' has the 'front' role.
        // The other cards ('left', 'right') have roles that match their ids.
        return id === 'main' ? 'front' : id; // ✅ Corrected line
  
      // This logic remains correct
      case 'left':
        return id === 'left' ? 'front' : id === 'main' ? 'right' : 'left';
  
      // This logic also remains correct
      case 'right':
        return id === 'right' ? 'front' : id === 'main' ? 'left'  : 'right';
    }
  };

  // The transform values are now simpler because the parent grid handles centering.
  // We use values like 85% to move the card relative to its own size,
  // creating the "peek" effect.
  const transform = {
    front : 'translate-x-0     scale-100 rotate-0  z-30',
    left  : '-translate-x-[20%] scale-95 -rotate-3 z-20',   // ← change here
    right : ' translate-x-[20%] scale-95  rotate-3  z-20',   // ← and here
  };

  const cards: { id: CardId; chart: JSX.Element }[] = [
    {
      id   : 'left',
      chart: <PerformanceChart data={chartData} height={250} baseline={23000} />,
    },
    {
      id   : 'main',
      chart: <AreaChart data={chartData} height={250}
                        enableAdvancedFeatures trend="positive" />,
    },
    {
      id   : 'right',
      chart: <PerformanceChart data={chartData} height={250} baseline="prev" />,
    },
  ];

  /* 3️⃣  render — never exits early, so hook count is stable */
  return (
    // Use a Grid container to center and stack the cards
    <div className="grid w-full place-items-center" style={{ height: 380 }}>
      {isLoading && (
        <Skeleton variant="rectangular" width="80%" height="90%" />
      )}

      {!isLoading && error && (
        <p className="text-red-600">Error: {error.message}</p>
      )}

      {!isLoading && !error && chartData.length === 0 && (
        <p>No performance data.</p>
      )}

      {!isLoading && !error && chartData.length > 0 && (
        cards.map(({ id, chart }) => {
          const role   = roleOf(id);
          const active = role === 'front';

          return (
            // Each card is placed in the same grid cell to stack them.
            // Transitions and transforms are applied for the carousel effect.
            <div
              key={id}
              className={`row-start-1 col-start-1 w-4/5 h-[95%] transition-transform duration-500 ease-in-out
                          ${transform[role]} ${!active ? 'cursor-pointer' : ''}`}
              style={{ transformOrigin: 'center center', perspective: 2000 }}
              onClick={() => !active && setFront(id)} // Only allow clicking back cards
            >
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isSmallScreen ? 2 : 4,
                  p: 2,
                  // The card content (text, charts) is hidden on the back cards for a cleaner look.
                  filter: active ? 'none' : 'brightness(0.8)',
                  overflow: 'hidden', // Ensures content doesn't spill out during transforms
                  boxShadow: active
                    ? '0 10px 30px -5px rgba(0,0,0,.35)'
                    : '0 25px 30px -15px rgba(0,0,0,.4)',
                  transition: 'box-shadow .3s, filter .3s',
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
        })
      )}

      {/* This ground shadow can be removed if not needed, as it was based on the previous layout */}
      {/* <div className="absolute inset-0 bg-black/5 -z-10 translate-y-4 blur-xl rounded-full" /> */}
    </div>
  );
});

export default SnapshotChart;