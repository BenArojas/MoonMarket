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
  const {selectedGraph, setSelectedGraph, percentageChange} = useContext(GraphContext);


  const handleListItemClick = (graph) => {
    setSelectedGraph(graph);
  };

  return (
    <Box
      className="Nav-views"
      sx={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-start", // Center the menu horizontally
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
              selected={selectedGraph === "Treemap"}
              onClick={() => handleListItemClick( "Treemap")}
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
              selected={selectedGraph === "DonutChart"}
              onClick={() => handleListItemClick( "DonutChart")}
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
              selected={selectedGraph === "Circular"}
              onClick={() => handleListItemClick( "Circular")}
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
              selected={selectedGraph === "Leaderboards"}
              onClick={() => handleListItemClick( "Leaderboards")}
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
