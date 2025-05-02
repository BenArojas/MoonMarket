import * as React from 'react';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { useMediaQuery, useTheme } from '@mui/material';

export default function TreeMapSkeleton() {
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        width: isMobileScreen ? '100%' : 1000,
        height: isMobileScreen ? 'auto' : 660,
        bgcolor: 'background.paper',
        p: isMobileScreen ? 0.5 : 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobileScreen ? 'column' : 'row',
          height: '100%',
          gap: isMobileScreen ? 1 : 0,
        }}
      >
        <Skeleton
          variant="rectangular"
          width={isMobileScreen ? '100%' : '50%'}
          height={isMobileScreen ? 200 : '100%'}
          sx={{ border: '1px solid #ccc' }}
        />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: isMobileScreen ? '100%' : '50%',
            height: isMobileScreen ? 'auto' : '100%',
            gap: isMobileScreen ? 1 : 0,
          }}
        >
          <Skeleton
            variant="rectangular"
            width="100%"
            height={isMobileScreen ? 100 : '50%'}
            sx={{ border: '1px solid #ccc' }}
          />
          <Skeleton
            variant="rectangular"
            width="100%"
            height={isMobileScreen ? 100 : '50%'}
            sx={{ border: '1px solid #ccc' }}
          />
        </Box>
      </Box>
    </Box>
  );
}
