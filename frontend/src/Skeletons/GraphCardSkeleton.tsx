import React from 'react';
import { Card, CardContent, Skeleton, Box } from '@mui/material';

const GraphCardSkeleton = () => {
  return (
    <Card sx={{ width: 550, height: 350 }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Title Skeleton */}
        <Skeleton variant="text" width="60%" height={28} />
        
        {/* Graph Skeleton */}
        <Box sx={{ flex: 1, display: 'flex', mt: 2 }}>
          {/* Y-axis labels */}
          <Box sx={{ width: '10%', mr: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Skeleton variant="text" width="100%" height={16} />
            <Skeleton variant="text" width="100%" height={16} />
            <Skeleton variant="text" width="100%" height={16} />
          </Box>
          
          {/* Graph area */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Skeleton variant="rectangular" width="100%" height="100%" />
            
            {/* X-axis labels */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Skeleton variant="text" width="12%" height={16} />
              <Skeleton variant="text" width="12%" height={16} />
              <Skeleton variant="text" width="12%" height={16} />
              <Skeleton variant="text" width="12%" height={16} />
              <Skeleton variant="text" width="12%" height={16} />
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default GraphCardSkeleton;