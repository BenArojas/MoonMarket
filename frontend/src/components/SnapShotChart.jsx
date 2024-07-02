import React, { useState } from 'react';
import useSnapshotData from '@/hooks/useSnapshotData'; // Adjust the import path as needed
import LineChart from '@/components/LineGraph'; // Adjust the import path as needed

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

  const chartData = selectedSnapshot === 'hourly' ? hourlySnapshots : dailySnapshots;

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
      {chartData === null ? (
        <div>Loading...</div>
      ) : (
        <LineChart
          width={width}
          height={height - BUTTONS_HEIGHT}
          data={chartData}
          dataType={selectedSnapshot}
        />
      )}
    </div>
  );
};