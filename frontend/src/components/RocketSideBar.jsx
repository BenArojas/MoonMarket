import React, { useContext } from "react";
import { Box } from "@mui/material";
import mainlogo from "/ToTheMoon.png";
import spaceship from "/spaceship.png";
import { Link } from "react-router-dom";
import { PercentageChange } from "@/pages/ProtectedRoute";
import ShootingStars from "@/components/ShootingStars";


function RocketSideBar() {
  const { percentageChange } = useContext(PercentageChange);

  const calculateSpaceshipPosition = () => {
    const clampedPercentage = Math.max(0, Math.min(percentageChange, 90));
    return `${clampedPercentage}%`;
  };
  
  return (
    <Box >
      <ShootingStars />
      <Box
        className="logo1"
        sx={{
          paddingTop: "30px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Link draggable={false} to="/portfolio" className="logo">
          <img draggable={false} src={mainlogo} style={{ height: "120px", width: "70px" }} />
        </Link>
      </Box>

      <img
        draggable={false}
        src={spaceship}
        style={{
          position: "absolute",
          bottom: calculateSpaceshipPosition(),
          left: "50%",
          transform: "translateX(-50%)",
          transition: "bottom 3s ease-in-out",
          width: "70px",
          height: "auto",
          zIndex: 1,
        }}
      />
    </Box>
  );
}

export default RocketSideBar;
