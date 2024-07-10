import React, { useState, useMemo } from 'react';
import useSnapshotData from '@/hooks/useSnapshotData';
import {LineChart} from '@/components/LineGraph';



export const SnapshotChart = ({ width, height }) => {
  const dailySnapshots = useSnapshotData();

  const chartData = useMemo(() => {
    if (dailySnapshots == null) {
      return [];
    }
    return dailySnapshots.slice(0, 6);
  }
    , [dailySnapshots]);

    

  return (
    <div>
      {chartData.length === 0 ? (
        <div>No data available</div>
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