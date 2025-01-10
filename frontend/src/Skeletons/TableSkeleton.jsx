import React from 'react';
import { Box, Grid, Skeleton, Container } from '@mui/material';

const SkeletonTable = () => {
  const numRows = 5; // Number of rows in the table

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        mt: 5,
        gap: 3, // Adds spacing between sections
      }}
    >
      {/* Skeleton Cards (Top Section) */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap', // Enables wrapping for smaller screens
          gap: 2, // Adjusts spacing between cards
        }}
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            width={250}
            height={100}
            sx={{
              flex: '1 1 200px', // Makes it responsive
              maxWidth: 250, // Limits the width on larger screens
            }}
          />
        ))}
      </Box>

      {/* Skeleton Table (Bottom Section) */}
      <Container>
        <Box sx={{ height: 'auto', mt: 3 }}>
          {Array.from({ length: numRows }).map((_, rowIndex) => (
            <Grid container key={rowIndex} spacing={2} alignItems="center">
              {/* Adjust the number of columns based on screen size */}
              {Array.from({ length: 5 }).map((_, colIndex) => (
                <Grid item xs={12} sm={6} md={4} lg={2.4} key={colIndex}>
                  <Skeleton
                    animation="wave"
                    height={70}
                    sx={{
                      width: '100%', // Full width for responsiveness
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default SkeletonTable;
