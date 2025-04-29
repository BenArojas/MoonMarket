import { Box, Stack, Typography, Tooltip, CircularProgress, useMediaQuery, useTheme } from '@mui/material'
import PortfolioValue from "@/components/AnimatedNumber";
import IconButton from "@mui/material/IconButton";
import SyncIcon from "@mui/icons-material/Sync";
import { ArrowDown, ArrowUp } from "lucide-react";
import {PremiumAiTipsButton} from '@/components/AiTipsButton'


function PortfolioStats({ value, percentageChange, stockTickers, incrementalChange, formattedDate, trend, updateStockPricesMutation, fetchInsights, loadingAI }) {
    const trendColor = trend === 'positive' ? "primary" : "error";
    const theme = useTheme();
    const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));


    const handleUpdatePrices = () => {
        updateStockPricesMutation.mutate(stockTickers);
    };


    return (
        <Box
            className="stats"
            sx={{
                display: "flex",
                flexDirection: isMobileScreen ? "column" : "row",
                alignItems: "center",
                p: 1,
            }}
        >
            <Stack direction={isMobileScreen ? "row" : 'column'} alignItems="center" sx={{
                width: isMobileScreen ? "100%" : 'unset',
                gap: isMobileScreen ? 3 : 0,
            }}>
                <Typography variant={isMobileScreen ? "h6" : "h5"}>Portfolio Value</Typography>
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
                <input type="hidden" name="" />
                <input type="hidden" name="value" value={value} />
                <Tooltip
                    title={`Last updated at: ${formattedDate} (GMT). Click to refresh stock prices.`}
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
                <PremiumAiTipsButton fetchInsights={fetchInsights} loadingAI={loadingAI} />

            </Box>
        </Box>
    )
}

export default PortfolioStats