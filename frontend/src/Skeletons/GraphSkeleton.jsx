import React from 'react';
import { Card } from '@mui/material';
import { cardio } from 'ldrs';
import { useTheme } from "@/contexts/ThemeContext";


// Register the cardio custom element
cardio.register();

function GraphSkeleton() {
const { mode } = useTheme();
  return (
    <Card
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <l-cardio
        size="50"
        stroke="4"
        speed="2"
        color={mode === "dark" ? "white" : "black"}
      ></l-cardio>
    </Card>
  );
}

export default GraphSkeleton;
