// import { PremiumAiTipsButton } from "@/components/AiTipsButton";
// import {
//   Box,
//   MenuItem,
//   Stack,
//   TextField,
//   useMediaQuery,
//   useTheme
// } from "@mui/material";
  
//   interface PortfolioStatsProps {

//     fetchInsights: () => void;
//     loadingAI: boolean;
//     handlePeriodChange: (period: string) => void;
//     selectedPeriod: string;
//   }
  
//   const PortfolioStats = ({

//     fetchInsights,
//     loadingAI,
//     handlePeriodChange,
//     selectedPeriod,
//   }: PortfolioStatsProps) => {
//     const theme = useTheme();
//     const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  

//     return (
//           <Stack
//           direction={isPhone ? "column" : "row"}
//           alignItems={isPhone ? "flex-start" : "center"}
//           spacing={2}
//           mt={isPhone ? 1 : 0}
//           justifyContent={"flex-end"}
//         >
//           <TextField
//             select
//             size="small"
//             label="Selected Period"
//             value={selectedPeriod}
//             onChange={(e) => handlePeriodChange(e.target.value)}
//             sx={{ minWidth: 140 }}
//           >
//             <MenuItem value="1D">Last Day</MenuItem>
//             <MenuItem value="7D">7 Days</MenuItem>
//             <MenuItem value="MTD">Month to date</MenuItem>
//             <MenuItem value="1M">1 Month</MenuItem>
//             <MenuItem value="YTD">Year to date</MenuItem>
//             <MenuItem value="1Y">1 Year</MenuItem>
//           </TextField>
  
//           <PremiumAiTipsButton fetchInsights={fetchInsights} loadingAI={loadingAI} />
//         </Stack>
//     );
//   };
  
//   export default PortfolioStats;
  

import { PremiumAiTipsButton } from '@/components/AiTipsButton';
import { Box, MenuItem, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';

interface PortfolioStatsProps {
    fetchInsights: () => void;
    loadingAI: boolean;
    handlePeriodChange: (period: string) => void;
    selectedPeriod: string;
}
function PortfolioStats({ fetchInsights, loadingAI, handlePeriodChange, selectedPeriod }: PortfolioStatsProps) {
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
            <Typography variant={"h5"}>Portfolio Performance</Typography>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "row",
                    gap: 2,
                    alignItems: "center",
                    ml: "auto",
                }}
            >

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

                <PremiumAiTipsButton fetchInsights={fetchInsights} loadingAI={loadingAI} />

            </Box>
        </Box>
    )
}

export default PortfolioStats