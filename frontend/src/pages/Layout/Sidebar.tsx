import RocketSideBar from "@/pages/Layout/RocketSideBar";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useLocation } from "react-router-dom";


function Sidebar() {
  let location = useLocation();
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return location.pathname === "/space" ? null : (
    <Box
      className="glass"
      sx={{
        width: isMobileScreen ? 45 : 60,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        paddingY: 4,
        flexShrink: 0,
      }}
    >
      <RocketSideBar isMobileScreen={isMobileScreen}/>
    </Box>
  );
}

export default Sidebar;
