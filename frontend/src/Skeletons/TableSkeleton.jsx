import React from 'react';
import { Box, Grid, Skeleton } from '@mui/material';

const SkeletonTable = () => {
    const numRows = 5;
    const numColumns = 5;

    return (
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
    );
};

export default SkeletonTable;
