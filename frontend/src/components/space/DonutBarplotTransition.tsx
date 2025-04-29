import { useState } from "react";
import { DonutBarplotChart } from "@/components/space/DonutBarPlotChart";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { SpaceshipHolding } from "@/pages/Space";


const BUTTONS_HEIGHT = 30;

interface DonutBarplotTransitionProps{
  Holdingsdata: SpaceshipHolding[]
}
export const DonutBarplotTransition = ({ Holdingsdata }:DonutBarplotTransitionProps) => {
  const [type, setType] = useState("pie");
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('xl'));

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Box sx={{
        height: 30,
        display: 'flex',
        gap: 3,
        justifyContent: 'center'
      }} >
        <button className="px-3 py-1 text-white border border-white rounded hover:bg-white hover:text-black transition-colors" onClick={() => setType("pie")}>
          Pie chart
        </button>
        <button className="px-3 py-1 text-white border border-white rounded hover:bg-white hover:text-black transition-colors" onClick={() => setType("bar")}>
          Barplot
        </button>
      </Box>
      <Box sx={{
        margin: 'auto'
      }}>
        <DonutBarplotChart
          width={isSmallScreen ? 400 : 800}
          height={isSmallScreen ? 250 - BUTTONS_HEIGHT : 380 - BUTTONS_HEIGHT}
          data={Holdingsdata}
          type={type}
        />
      </Box>
    </Box>
  );
};
