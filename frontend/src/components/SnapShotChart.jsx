import React, { useState, useMemo } from 'react';
import useSnapshotData from '@/hooks/useSnapshotData';
import {LineChart} from '@/components/LineGraph';



export const SnapshotChart = ({ width, height, refreshTrigger }) => {
  const dailySnapshots = useSnapshotData(refreshTrigger);

  const chartData = useMemo(() => {
    if (dailySnapshots == null) {
      return [];
    }
    return dailySnapshots.slice(0, 6).reverse();
  }
    , [dailySnapshots]);

  return (
    <div>
      {chartData.length === 0 ? (
        null
      ) : (
        <LineChart
          width={width}
          height={height }
          data={chartData}
        />
      )}
    </div>
   
  );
};