import * as React from 'react';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

export default function TreeMapSkeleton() {
  return (
    <Box sx={{ width: 1000, height: 660, bgcolor: 'background.paper', p: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
        <Skeleton variant="rectangular" width="50%" height="100%" sx={{ border: '1px solid #ccc' }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '50%', height: '100%' }}>
          <Skeleton variant="rectangular" width="100%" height="50%" sx={{ border: '1px solid #ccc' }} />
          <Skeleton variant="rectangular" width="100%" height="50%" sx={{ border: '1px solid #ccc' }} />
        </Box>
      </Box>
    </Box>
  );
}
