import * as React from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

export default function SearchStockSkeleton() {
  return (
    <Box sx={{ width: 500, height: 500, bgcolor: "background.paper", p: 1, margin:'auto', padding: 20 }}>
      {/* For variant="text", adjust the height via font-size */}
      <Skeleton variant="text" sx={{ fontSize: "1rem", paddingBottom: 3 }} />
      <Skeleton variant="text" sx={{ fontSize: "1rem", padding: 3  }} />
      <Skeleton variant="text" sx={{ fontSize: "1rem", padding: 3  }} />
      <Skeleton variant="text" sx={{ fontSize: "1rem", padding: 3  }} />
      <Skeleton variant="text" sx={{ fontSize: "1rem", padding: 3  }} />
      <Skeleton variant="rectangular" width={210} height={60} />
    </Box>
  );
}
