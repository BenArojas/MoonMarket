import React from 'react';
import { Box, Typography } from '@mui/material';

interface StockInfoCardProps {
  label: string;
  value: string | number;
}

const StockInfoCard: React.FC<StockInfoCardProps> = ({ label, value }) => {
  return (
    <Box sx={{ shrink: 0 }}>
      <Typography variant="overline" color="GrayText">{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
};

export default StockInfoCard; 