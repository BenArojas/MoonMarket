import { Box, Stack, Typography, Tooltip, CircularProgress } from '@mui/material'
import React, { useState, useEffect } from 'react'
import PortfolioValue from "@/components/AnimatedNumber";
import { useFetcher, Form } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import SyncIcon from "@mui/icons-material/Sync";
import { ArrowDown, ArrowUp } from "lucide-react";

function PortfolioStats({ value, percentageChange, stockTickers, incrementalChange, token, formattedDate }) {
    const fetcher = useFetcher();
    const [isLoading, setIsLoading] = useState(false);
    const trendColor = percentageChange > 0 ? "primary" : "error";
    useEffect(() => {
        if (fetcher.state === "submitting") {
            setIsLoading(true)
        } else if (fetcher.state === "idle" && fetcher.data) {
            setIsLoading(false)
        }
    }, [fetcher]);
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
                        {percentageChange.toFixed(2).toLocaleString("en-US")}%
                    </Typography>
                </Box>

                <Typography
                    variant="body1"
                    color={trendColor}
                    sx={{ fontWeight: "bold" }}
                >
                    {incrementalChange.toLocaleString("en-US")}$
                </Typography>
                {value === 0 ? null : (
                    <Form
                        method="post"
                        onSubmit={(e) => {
                            e.preventDefault();
                            fetcher.submit(e.currentTarget);
                        }}
                    >
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
                            <IconButton type="submit" sx={{ shrink: 0 }} name="intent" value="UpdatePrices" disabled={isLoading}>
                                {isLoading ? <CircularProgress size={24} /> : <SyncIcon />}
                            </IconButton>
                        </Tooltip>
                    </Form>
                )}
            </Box>
        </Box>
    )
}

export default PortfolioStats