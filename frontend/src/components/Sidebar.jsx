import React, { useContext } from "react";
import { Box } from "@mui/material";
import mainlogo from "/ToTheMoon.png";
import spaceship from "/spaceship.png";
import { Link } from "react-router-dom";
import { GraphContext } from "@/pages/ProtectedRoute";
import ShootingStars from "@/components/ShootingStars";

function Sidebar() {
  const { percentageChange } = useContext(GraphContext);

  const calculateSpaceshipPosition = () => {
    const clampedPercentage = Math.max(0, Math.min(percentageChange, 90));
    return `${clampedPercentage}%`;
  };

  return (
    <Box
      sx={{
        backgroundColor: "#1d1d1d",
        width: 70,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <ShootingStars />

      <Box
        className="logo1"
        sx={{
          paddingTop: "30px",
          position: "relative",
          zIndex: 1
        }}
      >
        <Link to="/portfolio" className="logo">
          <img src={mainlogo} style={{ height: "120px", width: "70px" }} />
        </Link>
      </Box>

      {/* Spaceship positioned relative to the entire sidebar */}
      <img
        draggable={false}
        src={spaceship}
        style={{
          position: "absolute",
          bottom: calculateSpaceshipPosition(),
          left: "50%",
          transform: "translateX(-50%)",
          transition: "bottom 1s ease-in-out",
          width: "70px",
          height: "auto",
          zIndex: 1
        }}
      />
    </Box>
  );
}

export default Sidebar;