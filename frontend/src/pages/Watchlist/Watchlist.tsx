// src/pages/Watchlist/Watchlist.tsx

import { fetchWatchlists } from "@/api/watchlist";
import { useStockStore } from "@/stores/stockStore";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { WatchlistContent } from "./WatchlistContent";


export const CenteredBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ height: "70vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
    {children}
  </Box>
);

const WatchlistPage: React.FC = () => {
  const { watchlists, setWatchlists } = useStockStore();
  const [selectedId, setSelectedId] = useState<string>("");

  /* --- Fetch Watchlist IDs --- */
  const { data: fetchedWatchlists, isPending: listIsPending } = useQuery({
    queryKey: ["watchlists"],
    queryFn: fetchWatchlists,
  });

  useEffect(() => {
    if (fetchedWatchlists) {
      setWatchlists(fetchedWatchlists);
      // Set the first watchlist as selected by default, only if one isn't already selected.
      if (!selectedId && Object.keys(fetchedWatchlists).length > 0) {
        setSelectedId(Object.keys(fetchedWatchlists)[0]);
      }
    }
  }, [fetchedWatchlists, setWatchlists, selectedId]);

  if (listIsPending) {
    return <CenteredBox><CircularProgress /></CenteredBox>;
  }

  return (
    <Box sx={{ height: "calc(90vh - 90px)", overflow: "auto", paddingX: { xs: 2, sm: 4, md: 10, lg: 15 }, paddingY: 5 }}>
      {/* --- Watchlist Selector --- */}
      <FormControl sx={{ minWidth: 240, mb: 2 }}>
        <InputLabel id="wl-label">Select Watchlist</InputLabel>
        <Select labelId="wl-label" value={selectedId} label="Select Watchlist" onChange={(e) => setSelectedId(e.target.value as string)}>
          {Object.entries(watchlists).map(([id, name]) => (<MenuItem key={id} value={id}>{name}</MenuItem>))}
        </Select>
      </FormControl>

      {/* --- Main Content Rendering --- */}
      {selectedId ? (
        // The `key` prop is the BUG FIX. It forces React to create a new
        // instance of WatchlistContent when the ID changes, resetting all its state.
        <WatchlistContent key={selectedId} selectedId={selectedId} />
      ) : (
        <CenteredBox>
            <Alert severity="info">Please select a watchlist to begin.</Alert>
        </CenteredBox>
      )}
    </Box>
  );
};

export default WatchlistPage;