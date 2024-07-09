import { Box } from "@mui/material";
import React, { useState, useEffect, useContext } from "react";
import mainlogo from "/ToTheMoon.png";
import spaceship from "/spaceship.png";
import { Link, useLocation } from "react-router-dom";
import AutoAwesomeMosaicIcon from "@mui/icons-material/AutoAwesomeMosaic";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import TocSharpIcon from "@mui/icons-material/TocSharp";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import BlurCircularIcon from "@mui/icons-material/BlurCircular";
import { GraphContext } from "@/pages/ProtectedRoute";

function Sidebar() {
  const location = useLocation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { setSelectedGraph, percentageChange } = useContext(GraphContext);

  const calculateSpaceshipPosition = () => {
    // Clamp percentageChange between 0 and 100
    const clampedPercentage = Math.max(0, Math.min(percentageChange, 100));
    // Calculate position (0% is bottom, 100% is top)
    return `${clampedPercentage}%`;
  };

  useEffect(() => {
    if (selectedIndex === undefined) {
      setSelectedIndex(0);
    }
  }, [location.pathname]);

  const handleListItemClick = (index, graph) => {
    setSelectedIndex(index);
    setSelectedGraph(graph);
    // console.log("Selected graph:", graph);
  };


  return (
    <Box
      sx={{
        backgroundColor: "#1d1d1d",
        width: 70,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
      }}
    >
      <Box
        className="logo1"
        sx={{
          paddingTop: "30px",
          height: "50%",
          
        }}
      >
        <Link to="/portfolio" className="logo">
          <img src={mainlogo} style={{ height: "120px", width: "70px" }} />
        </Link>
        <img
        draggable={false}
          src={spaceship}
          style={{
            position: "absolute",
            bottom: calculateSpaceshipPosition(),
            transition: "bottom 1s ease-in-out",
            width: "70px", // Adjust as needed
            height: "auto", // Maintain aspect ratio
          }}
        />
      </Box>
    </Box>
  );
}

export default Sidebar;
