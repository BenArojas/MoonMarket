import { useThemeHook } from "@/contexts/ThemeContext";
import { Card } from '@mui/material';
import { cardio } from 'ldrs';


// Register the cardio custom element
cardio.register();

function GraphSkeleton({ height }) {
  const { mode } = useThemeHook();
  return (
    <Card
      sx={{
        width: "100%",
        height: height ? height : "100%",
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
