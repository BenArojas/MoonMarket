import * as React from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

export default function PortfolioStockSkeleton() {
  return (
    <Box
      sx={{
        width: { xs: "90%", sm: 500 }, // Adjust width for mobile
        height: "auto", // Let height adjust automatically
        bgcolor: "background.paper",
        p: { xs: 2, sm: 3 }, // Padding adjusts for screen size
        margin: "auto",
        borderRadius: 2, // Add slight rounding for a cleaner look
        boxShadow: 3, // Add subtle shadow for depth
      }}
    >
      {/* Buttons Row */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" }, // Stack on mobile, row on larger screens
          justifyContent: "space-between",
          gap: { xs: 2, sm: 0 }, // Add gap for stacked layout
          mb: 3, // Add margin below
        }}
      >
        <Skeleton variant="rectangular" width={120} height={40} />
        <Skeleton variant="rectangular" width={120} height={40} />
        <Skeleton variant="rectangular" width={120} height={40} />
      </Box>

      {/* Text Rows */}
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          sx={{
            fontSize: "1rem",
            mb: 2, // Margin between skeleton rows
          }}
        />
      ))}
    </Box>
  );
}
