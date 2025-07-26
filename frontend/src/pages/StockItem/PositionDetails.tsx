// src/components/PositionDetails.tsx

import { useStockStore } from "@/stores/stockStore";
import { Box, Collapse, Divider, Grid, IconButton, Paper, Typography } from '@mui/material';
import React, { useState } from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// Helper for formatting currency
const formatCurrency = (value?: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
};

export const PositionDetails: React.FC = () => {
    const position = useStockStore((state) => state.activeStock.position);
    const [isExpanded, setIsExpanded] = useState(true);

    if (!position) {
        return (
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    You do not hold a position in this instrument.
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Box
                onClick={() => setIsExpanded(!isExpanded)}
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    cursor: 'pointer',
                    borderBottom: isExpanded ? '1px solid' : 'none',
                    borderColor: 'divider',
                }}
            >
                <Typography variant="h6">My Position</Typography>
                <IconButton size="small">
                    {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                </IconButton>
            </Box>
            <Collapse in={isExpanded}>
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                        {/* Grid items remain exactly the same */}
                        <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Quantity:</Typography>
                            <Typography variant="body1" component="p">
                                {position.position.toLocaleString()}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Avg. Cost:</Typography>
                            <Typography variant="body1" component="p">
                                {formatCurrency(position.avgCost)}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Market Value:</Typography>
                            <Typography variant="body1" component="p">
                                {formatCurrency(position.mktValue)}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Unrealized P/L:</Typography>
                            <Typography 
                                variant="body1" 
                                component="p"
                                color={position.unrealizedPnl >= 0 ? 'success.main' : 'error.main'}
                            >
                                {formatCurrency(position.unrealizedPnl)}
                            </Typography>
                        </Grid>
                    </Grid>
                </Box>
            </Collapse>
        </Paper>
    );
};