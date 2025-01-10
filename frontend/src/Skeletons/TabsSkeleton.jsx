import * as React from "react";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { Box } from "@mui/material";

function TabsSkeleton() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        margin: "auto",
      }}
    >
      <Stack>
        <Stack direction={"row"}>
          <Skeleton animation="wave" width={150} height={40} />
          <Skeleton animation="wave" width={150} height={40} />
          <Skeleton animation="wave" width={150} height={40} />
        </Stack>
        <Skeleton animation="wave" width={450} height={300} />
      </Stack>
    </Box>
  );
}

export default TabsSkeleton;
