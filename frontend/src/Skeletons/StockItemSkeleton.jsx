import React from 'react';
import { Skeleton, Box, Typography } from '@mui/material';

const StockItemSkeleton = () => {
  return (
    <Box sx={{ padding: 3 }}>
      <Skeleton variant="text" width={200} height={40} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Skeleton variant="text" width={100} height={30} />
        <Skeleton variant="text" width={100} height={30} />
      </Box>
      <Skeleton variant="rectangular" width="100%" height={400} sx={{ mt: 3 }} />
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6">Key Statistics</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1 }}>
          {[...Array(6)].map((_, index) => (
            <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton variant="text" width={100} />
              <Skeleton variant="text" width={50} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default StockItemSkeleton;