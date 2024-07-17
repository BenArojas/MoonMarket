import React, { useContext } from "react";
import { Box } from "@mui/material";
import { useLocation } from "react-router-dom";
import RocketSideBar from "@/components/RocketSideBar";
import FriendsSideBar from "@/components/FriendsSideBar";

function Sidebar() {
  let location = useLocation();

  return (
    <Box
      sx={{
        backgroundColor: "#1d1d1d",
        width: 70,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        // alignItems: "center",
        position: "relative",
        overflow: "hidden",
        paddingY: 4,
        flexShrink: 0,
      }}
    >
      {location.pathname === "/space" ? <FriendsSideBar /> : <RocketSideBar />}
    </Box>
  );
}

export default Sidebar;
