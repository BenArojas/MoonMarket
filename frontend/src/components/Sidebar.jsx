import React, { useContext } from "react";
import { Box } from "@mui/material";
import { useLocation } from "react-router-dom";
import RocketSideBar from "@/components/RocketSideBar";
import FriendsSideBar from "@/components/FriendsSideBar";

function Sidebar() {
  let location = useLocation();

  return location.pathname === "/space" ? null : (
    <Box
      className="glass"
      sx={{
        // backgroundColor: "#1d1d1d",
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
      <RocketSideBar />
    </Box>
  );
}

export default Sidebar;
