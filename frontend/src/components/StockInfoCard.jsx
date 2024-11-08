import React from 'react';
import { Box, Typography } from '@mui/material';

function StockInfoCard({ label, value }) {
  return (
    <Box sx={{ shrink: 0 }}>
      <Typography variant="overline" color="GrayText">{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

export default StockInfoCard;