import React from 'react';
import { Box, Grid, Skeleton,Container } from '@mui/material';

const SkeletonTable = () => {
    const numRows = 5;
    const numColumns = 5;

    return (
        <Box sx={{
            display:'flex',
            flexDirection: 'column',
            mt:5
        }}>
        <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            gap:5
            }}>
        <Skeleton variant="rectangular" width={250} height={100} />
        <Skeleton variant="rectangular" width={250} height={100} />
        <Skeleton variant="rectangular" width={250} height={100} />
        <Skeleton variant="rectangular" width={250} height={100} />
        <Skeleton variant="rectangular" width={250} height={100} />
        </Box>
        <Container>
        <Box sx={{ height: 450,mt: 3 }}>
            {/* Skeleton Rows */}
            {Array.from({ length: numRows }).map((_, rowIndex) => (
                <Grid container key={rowIndex} spacing={2} alignItems="center">
                    {Array.from({ length: numColumns }).map((_, colIndex) => (
                        <Grid item xs key={colIndex}>
                            <Skeleton animation="wave" height={70} />
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
