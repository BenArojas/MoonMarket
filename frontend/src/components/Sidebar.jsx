import React, { useContext } from "react";
import { useLocation } from "react-router-dom";
import RocketSideBar from "@/components/RocketSideBar";
import FriendsSideBar from "@/components/FriendsSideBar";
import { Box, Stack, useMediaQuery, useTheme } from "@mui/material";


function Sidebar() {
  let location = useLocation();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('xl'));
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return location.pathname === "/space" ? null : (
    <Box
      className="glass"
      sx={{
        width: isMobileScreen ? 45 : 70,
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
