import { Box, Typography } from "@mui/material";
import { useRouteError, isRouteErrorResponse } from "react-router-dom"; // 1. Import the hook and a type guard

// 2. The component no longer needs to accept any props.
export function ErrorFallback() {
  // 3. Call the hook to get the error that was thrown.
  const error = useRouteError();
  let errorMessage: string;

  // 4. (Recommended) Check what kind of error was thrown for a better message.
  if (isRouteErrorResponse(error)) {
    // This is a special Response error from a loader (e.g., throw new Response(...))
    errorMessage = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    // This is a standard JavaScript error
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    console.error(error);
    errorMessage = "An unknown error occurred.";
  }

  return (
    <Box role="alert" sx={{ backgroundColor: "red", color: "white", p: 2, borderRadius: 1 }}>
      <Typography variant="h6">Something went wrong:</Typography>
      <Typography variant="body2">{errorMessage}</Typography>
    </Box>
  );
}

// You no longer need the ErrorFallbackProps interface.