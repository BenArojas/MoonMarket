import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Box, Typography } from "@mui/material";
import { Paths } from "@/constants/paths";

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigateHome = (): void => {
    // 2. Use the Paths object for the correct home path
    navigate(Paths.protected.app.home);
  };

  return (
    <Box
      className="bg-black text-white h-screen flex flex-col items-center justify-center"
      sx={{
        backgroundImage: "url(/earth-seen-from-space.jpg)", // Replace with your space-themed image URL
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Typography
        variant="h1"
        className="text-6xl font-bold mb-4"
        sx={{ textShadow: "2px 2px 8px rgba(0, 0, 0, 0.7)" }}
      >
        404
      </Typography>
      <Typography
        variant="h5"
        className="mb-8 text-lg"
        sx={{ textShadow: "1px 1px 5px rgba(0, 0, 0, 0.5)" }}
      >
        Oops! The page you're looking for is lost in space.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        className="hover:scale-105 transition-transform"
        sx={{
          padding: "10px 20px",
          borderRadius: "20px",
          backgroundColor: "#3f51b5",
          "&:hover": {
            backgroundColor: "#283593",
          },
        }}
        onClick={handleNavigateHome}
      >
        Go to Home
      </Button>
    </Box>
  );
};

export default NotFoundPage;
