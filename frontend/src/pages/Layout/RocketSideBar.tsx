import  { useContext } from "react";
import { Box } from "@mui/material";
import mainlogo from "/ToTheMoon.png";
import spaceship from "/spaceship.png";
import { Link } from "react-router-dom";
import { PercentageChange } from "@/contexts/PercentageChangeContext";
import ShootingStars from "@/pages/Layout/ShootingStars";
import { Paths } from "@/constants/paths";

interface RocketSideBarProps{
  isMobileScreen: boolean
}
function RocketSideBar({ isMobileScreen }: RocketSideBarProps) {
  const { percentageChange } = useContext(PercentageChange);

// const calculateSpaceshipPosition = () => {
//   const maxPosition = isMobileScreen ? 50 : 90; // Clamp lower for mobile screens
//   const clampedPercentage = Math.max(0, Math.min(percentageChange, maxPosition));
//   return `${clampedPercentage}%`;
// };
const calculateSpaceshipPosition = () => {
  const minPosition = isMobileScreen ? 25 : 0; // Minimum bottom position
  const maxPosition = isMobileScreen ? 95 : 90; // Maximum bottom position

  const clampedPercentage = Math.max(0, Math.min(percentageChange, 100));
  const interpolatedPosition =
    minPosition + ((clampedPercentage / 100) * (maxPosition - minPosition));

  return `${interpolatedPosition}%`;
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
        <Link draggable={false} to={Paths.protected.app.home} className="logo">
          <img draggable={false} src={mainlogo} style={{ height: isMobileScreen ? "80px" : "120px", width: isMobileScreen ? '50px' : "70px" }} />
        </Link>
      </Box>

      <img
      id="rocket"
        draggable={false}
        src={spaceship}
        style={{
          position: "absolute",
          bottom: calculateSpaceshipPosition(),
          left: "50%",
          transform: "translateX(-50%)",
          transition: "bottom 3s ease-in-out",
          width:isMobileScreen ? '40px': "70px",
          height: "auto",
          zIndex: 100,
        }}
      />
    </Box>
  );
}

export default RocketSideBar;
