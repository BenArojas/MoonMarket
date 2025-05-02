import React from 'react';
import { Box, CircularProgress } from "@mui/material";

const DonutSkeleton = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: { xs: 300, sm: 400, md: 500 }, // Adjust width for different screen sizes
        height: { xs: 300, sm: 400, md: 500 }, // Match height to width for a perfect circle
        backgroundColor: 'background.paper',
        borderRadius: '50%', // Ensure circular shape
        margin: 'auto', // Center on smaller screens
        boxShadow: 3, // Subtle shadow for better appearance
      }}
    >
      <CircularProgress size={80} /> {/* Keep spinner size consistent */}
    </Box>
  );
};

export default DonutSkeleton;
