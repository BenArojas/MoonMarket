import { Box, Stack, Typography, Tooltip, CircularProgress } from '@mui/material'
import React, { useState, useEffect } from 'react'
import PortfolioValue from "@/components/AnimatedNumber";
import IconButton from "@mui/material/IconButton";
import SyncIcon from "@mui/icons-material/Sync";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateStockPrice } from '@/api/stock';



function PortfolioStats({ value, percentageChange, stockTickers, incrementalChange, token, formattedDate, trend }) {
    const trendColor = trend === 'positive' ? "primary" : "error";
    const queryClient = useQueryClient();

    const updateStockPricesMutation = useMutation({
        mutationFn: async (tickers) => {
            const promises = tickers.map((ticker) => updateStockPrice(ticker, token));
            return Promise.allSettled(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userData', token] });
        },
    });
    const handleUpdatePrices = () => {
        updateStockPricesMutation.mutate(stockTickers);
    }
    
    return (
        <Box
            className="stats"
            sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                p: 1,
            }}
        >
            <Stack>
                <Typography variant="h5">Portfolio Value</Typography>
                <PortfolioValue value={value} />
            </Stack>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "row",
                    gap: 2,
                    alignItems: "center",
                    ml: "auto",
                }}
            >
                <Box sx={{ display: "flex" }}>
                    <Typography color={trendColor}>
                        {percentageChange > 0 ? <ArrowUp /> : <ArrowDown />}
                    </Typography>
                    <Typography
                        variant="body1"
                        color={trendColor}
                        sx={{ fontWeight: "bold" }}
                    >
                        {percentageChange?.toFixed(2).toLocaleString("en-US")}%
                    </Typography>
                </Box>

                <Typography
                    variant="body1"
                    color={trendColor}
                    sx={{ fontWeight: "bold" }}
                >
                    {incrementalChange.toLocaleString("en-US")}$
                </Typography>


                <input
                    type="hidden"
                    name="tickers"
                    value={stockTickers.join(",")}
                />
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="value" value={value} />
                <Tooltip
                    title={`last updated at: ${formattedDate}. Click to refresh Stocks price`}
                    placement="top"
                >
                    <IconButton
                        type="submit"
                        sx={{ shrink: 0 }}
                        name="intent"
                        value="UpdatePrices"
                        onClick={handleUpdatePrices}
                    >
                        {updateStockPricesMutation.isPending ? <CircularProgress size={24} /> : <SyncIcon />}
                    </IconButton>
                </Tooltip>

            </Box>
        </Box>
    )
}

export default PortfolioStats