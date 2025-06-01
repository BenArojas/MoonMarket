import { Box, MenuItem, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material'
import PortfolioValue from "@/components/AnimatedNumber";
import { ArrowDown, ArrowUp } from "lucide-react";
import { PremiumAiTipsButton } from '@/components/AiTipsButton'

interface PortfolioStatsProps {
    value: number;
    // percentageChange: number;
    // trend: 'positive' | 'negative';
    fetchInsights: () => void;
    loadingAI: boolean;
    handlePeriodChange: (period: string) => void;
    selectedPeriod: string;
}
function PortfolioStats({  value, fetchInsights, loadingAI, handlePeriodChange, selectedPeriod }: PortfolioStatsProps) {
    // const trendColor = trend === 'positive' ? "primary" : "error";
    const theme = useTheme();
    const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));


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
                {/* <Box sx={{ display: "flex" }}>
                    <Typography color={trendColor}>
                        {percentageChange > 0 ? <ArrowUp /> : <ArrowDown />}
                    </Typography>
                    <Typography
                        variant="body1"
                        color={trendColor}
                        sx={{ fontWeight: "bold" }}
                    >
                        {percentageChange?.toFixed(2)}%
                    </Typography>
                </Box> */}
                <TextField
                    select
                    size="small"
                    label="Selected Period"
                    value={selectedPeriod}
                    onChange={(e) => handlePeriodChange(e.target.value)}
                    sx={{ minWidth: 120 }}
                >
                    <MenuItem value="1D">Last Day</MenuItem>
                    <MenuItem value="7D"> 7 Days</MenuItem>
                    <MenuItem value="MTD">Month to date</MenuItem>
                    <MenuItem value="1M">1 Month</MenuItem>
                    <MenuItem value="YTD">Year to date </MenuItem>
                    <MenuItem value="1Y">1 Year</MenuItem>
                </TextField>

                {/* <Typography
                    variant="body1"
                    color={trendColor}
                    sx={{ fontWeight: "bold" }}
                >
                    {incrementalChange.toLocaleString("en-US")}$
                </Typography> */}
                <PremiumAiTipsButton fetchInsights={fetchInsights} loadingAI={loadingAI} />

            </Box>
        </Box>
    )
}

export default PortfolioStats