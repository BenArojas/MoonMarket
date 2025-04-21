import { Box, Typography } from "@mui/material";


export function ErrorFallback({ error }) {
  return (
    <Box role="alert" sx={{ backgroundColor: "red", color: "white", p: 2, borderRadius: 1 }}>
      <Typography variant="h6">Something went wrong:</Typography>
      <Typography variant="body2">{error.message}</Typography>
    </Box>
  );
}