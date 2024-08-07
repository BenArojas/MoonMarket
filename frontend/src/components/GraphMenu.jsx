import { Box } from "@mui/material";
import React, { useState, useEffect, useContext } from "react";
import AutoAwesomeMosaicIcon from "@mui/icons-material/AutoAwesomeMosaic";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import TocSharpIcon from "@mui/icons-material/TocSharp";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import BlurCircularIcon from "@mui/icons-material/BlurCircular";

import SearchBar from "@/components/SearchBar.jsx";

function GraphMenu({ selectedGraph, setSelectedGraph }) {
 

  const handleListItemClick = (graph) => {
    setSelectedGraph(graph);
  };

  return (
    <Box
      className="Nav-views"
      sx={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between", // Center the menu horizontally
        padding: "10px 0", 
      }}
    >
      <nav aria-label="main mailbox folders">
        <List
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 1,
          }}
        >
          <ListItem disablePadding>
            <ListItemButton
              selected={selectedGraph === "Treemap"}
              onClick={() => handleListItemClick("Treemap")}
            >
              <ListItemIcon
                sx={{
                  justifyContent: "center", // Center the icon
                }}
              >
                <AutoAwesomeMosaicIcon />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              selected={selectedGraph === "DonutChart"}
              onClick={() => handleListItemClick("DonutChart")}
            >
              <ListItemIcon
                sx={{
                  justifyContent: "center", // Center the icon
                }}
              >
                <DonutLargeIcon />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              selected={selectedGraph === "Circular"}
              onClick={() => handleListItemClick("Circular")}
            >
              <ListItemIcon
                sx={{
                  justifyContent: "center", // Center the icon
                }}
              >
                <BlurCircularIcon />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              selected={selectedGraph === "Leaderboards"}
              onClick={() => handleListItemClick("Leaderboards")}
            >
              <ListItemIcon
                sx={{
                  justifyContent: "center", // Center the icon
                }}
              >
                <TocSharpIcon />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        </List>
      </nav>
      <SearchBar />
    </Box>
  );
}

export default GraphMenu;
