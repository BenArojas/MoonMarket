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

function GraphMenu() {
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
      className="Nav-views"
      sx={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center", // Center the menu horizontally
        padding: "20px 0", // Add some vertical padding
        // borderBottom: "1px solid #e0e0e0",
      }}
    >
      <nav aria-label="main mailbox folders">
        <List
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 2,
          }}
        >
          <ListItem disablePadding>
            <ListItemButton
              selected={selectedIndex === 0}
              onClick={() => handleListItemClick(0, "Treemap")}
            >
              <ListItemIcon sx={{ 
                justifyContent: 'center', // Center the icon
              }}>
                <AutoAwesomeMosaicIcon />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              selected={selectedIndex === 1}
              onClick={() => handleListItemClick(1, "DonutChart")}
            >
              <ListItemIcon sx={{ 
                justifyContent: 'center', // Center the icon
              }}>
                <DonutLargeIcon />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              selected={selectedIndex === 2}
              onClick={() => handleListItemClick(2, "Circular")}
            >
              <ListItemIcon sx={{ 
                justifyContent: 'center', // Center the icon
              }}>
                <BlurCircularIcon />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              selected={selectedIndex === 3}
              onClick={() => handleListItemClick(3, "Leaderboards")}
            >
              <ListItemIcon sx={{ 
                justifyContent: 'center', // Center the icon
              }}>
                <TocSharpIcon />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        </List>
      </nav>
    </Box>
  );
}

export default GraphMenu;
