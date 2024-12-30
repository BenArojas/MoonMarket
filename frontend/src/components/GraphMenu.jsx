import { Box, Button } from "@mui/material";
import React from "react";
import AutoAwesomeMosaicIcon from "@mui/icons-material/AutoAwesomeMosaic";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import TocSharpIcon from "@mui/icons-material/TocSharp";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import BlurCircularIcon from "@mui/icons-material/BlurCircular";
import SearchBar from "@/components/SearchBar.jsx";
import SchemaIcon from "@mui/icons-material/Schema";
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

function GraphMenu({ selectedGraph, setSelectedGraph, isMobileScreen, isDailyView, setIsDailyView }) {
  const handleListItemClick = (graph) => {
    if (graph !== "Treemap" && isDailyView) {
      setIsDailyView(false);
    }
    setSelectedGraph(graph);
  };

  return (
    <Box
      className="Nav-views"
      sx={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        padding: "10px 0",
        mb: 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          variant={isDailyView ? "contained" : "outlined"}
          startIcon={<TrendingUpIcon />}
          onClick={() => setIsDailyView(!isDailyView)}
          size="small"
          color="primary"
          disabled={selectedGraph !== "Treemap"}
          sx={{
            minWidth: isMobileScreen ? "60px" : "100px",
            height: "40px",
            borderRadius: "8px",
            opacity: selectedGraph !== "Treemap" ? 0.6 : 1,
          }}
        >
          Daily
        </Button>
        <nav aria-label="main mailbox folders">
          <List
            sx={{
              display: "flex",
              flexDirection: "row",
              gap: 1,
            }}
          >
            {/* Always show Treemap */}
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

            {/* Always show DonutChart */}
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

            {/* Conditionally render other graph options only if not on mobile */}
            {!isMobileScreen && (
              <>
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

                <ListItem disablePadding>
                  <ListItemButton
                    selected={selectedGraph === "Sankey"}
                    onClick={() => handleListItemClick("Sankey")}
                  >
                    <ListItemIcon
                      sx={{
                        justifyContent: "center", // Center the icon
                      }}
                    >
                      <SchemaIcon />
                    </ListItemIcon>
                  </ListItemButton>
                </ListItem>
              </>
            )}
          </List>
        </nav>
      </Box>
      <SearchBar />
    </Box>
  );
}

export default GraphMenu;
