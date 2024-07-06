import React, { useState, useMemo } from 'react';
import useSnapshotData from '@/hooks/useSnapshotData';
import LineChart from '@/components/LineGraph';

const BUTTONS_HEIGHT = 50;

const buttonStyle = {
  border: "1px solid #9a6fb0",
  borderRadius: "3px",
  padding: "4px 8px",
  margin: "10px 2px",
  fontSize: 14,
  color: "#9a6fb0",
  opacity: 0.7,
};

export const SnapshotChart = ({ width, height }) => {
  const [hourlySnapshots, dailySnapshots] = useSnapshotData();
  const [selectedSnapshot, setSelectedSnapshot] = useState('hourly');

  const handleSnapshotChange = (snapshotType) => {
    setSelectedSnapshot(snapshotType);
  };

  const chartData = useMemo(() => {
    if (hourlySnapshots == null || dailySnapshots == null) {
      return [];
    }
  
    if (selectedSnapshot === "hourly") {
      // Filter hourly snapshots for the current day
      const today = new Date().setHours(0, 0, 0, 0);
      return hourlySnapshots.filter(
        (snapshot) => new Date(snapshot.timestamp) >= today
      );
    } else {
      // Use the last 5 days of daily snapshots (or all if less than 5)
      const sortedDailyData = dailySnapshots
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .slice(-5);
      
      
      
      return sortedDailyData;
    }
  }, [selectedSnapshot, hourlySnapshots, dailySnapshots]);

  return (
    <div>
      <div style={{ height: BUTTONS_HEIGHT }}>
        <button 
          style={buttonStyle} 
          onClick={() => handleSnapshotChange('hourly')}
        >
          Hourly
        </button>
        <button 
          style={buttonStyle} 
          onClick={() => handleSnapshotChange('daily')}
        >
          Daily
        </button>
      </div>
      {chartData.length === 0 ? (
        <div>No data available</div>
      ) : (
        <LineChart
          key={selectedSnapshot} // Add this line
          width={width}
          height={height - BUTTONS_HEIGHT}
          data={chartData}
          dataType={selectedSnapshot}
        />
      )}
    </div>
  );
};