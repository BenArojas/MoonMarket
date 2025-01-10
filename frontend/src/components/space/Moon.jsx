import React from "react";
import Starfield from "react-starfield";
import "@/styles/space.css";
import HumanSpaceship from "/spaceship_4.png";

const Moon = ({ centerX, centerY }) => {
  return (
    <div
      className="moon"
      style={{
        position: "absolute",
        width: "150px",
        height: "150px",
        borderRadius: "50%",
        backgroundColor: "#f4f4f4",
        boxShadow: "0 0 20px rgba(255, 255, 255, 0.5)",
        transform: "translate(-50%, -50%)",
        top: centerY,
        left: centerX,
      }}
    >
      <div className="crater crater-1"></div>
      <div className="crater crater-2"></div>
      <div className="crater crater-3"></div>
    </div>
   
  );
};

export default Moon;
