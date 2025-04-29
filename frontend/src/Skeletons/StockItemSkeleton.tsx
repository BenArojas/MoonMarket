import React from 'react';
import { Skeleton, Box, Typography } from '@mui/material';

const StockItemSkeleton = () => {
  return (
    <Box
      sx={{
        padding: { xs: 2, sm: 3 }, // Adjust padding for mobile and larger screens
        maxWidth: 600,
        margin: 'auto', // Center the skeleton on smaller screens
      }}
    >
      {/* Title Skeleton */}
      <Skeleton
        variant="text"
        width="80%" // Responsive width
        height={40}
        sx={{ margin: 'auto' }}
      />
      
      {/* Text Skeleton Row */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' }, // Stack on small screens
          gap: 2, // Spacing between stacked items
          mt: 2,
        }}
      >
        <Skeleton variant="text" width="60%" height={30} />
        <Skeleton variant="text" width="60%" height={30} />
      </Box>

      {/* Main Content Skeleton */}
      <Skeleton
        variant="rectangular"
        width="100%"
        height={{ xs: 250, sm: 400 }} // Smaller height for mobile
        sx={{ mt: 3 }}
      />

      {/* Key Statistics Section */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Key Statistics
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, // Single column on mobile
            gap: 2, // Adjust spacing
          }}
        >
          {[...Array(6)].map((_, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Skeleton variant="text" width="50%" />
              <Skeleton variant="text" width="30%" />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default StockItemSkeleton;
