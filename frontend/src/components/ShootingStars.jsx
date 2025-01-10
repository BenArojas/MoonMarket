import React from "react";
import { useTheme } from "@mui/material/styles";

const ShootingStars = () => {
  const theme = useTheme();

  // Determine the background color based on the current theme mode
  const backgroundColor =
    theme.palette.mode === "dark"
      ? "linear-gradient(to bottom, #151515, #0b0b0b)"
      : "linear-gradient(to bottom, #bfbfbf ,#efefef)"; // Light to medium gray gradient

  const spans = [
    { top: 0, right: 0, animationDuration: "1s" },
    { top: 0, right: 0, animationDuration: "3s" },
    { top: 80, right: 0, animationDuration: "2s" },
    { top: 0, right: 0, animationDuration: "1.5s" },
    { top: 0, right: 0, animationDuration: "2.5s" },
    { top: 0, right: 0, animationDuration: "3s" },
    { top: 300, right: 0, animationDuration: "1.75s" },
    { top: 0, right: 0, animationDuration: "1.25s" },
    {
      top: 0,
      right: 1000,
      animationDuration: "2.25s",
    },
    { top: 0, right: 450, animationDuration: "2.75s" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 70,
        minHeight: "100vh",
        backgroundImage: backgroundColor,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        overflow: "hidden",
        animation: "animateBg 50s linear infinite",
      }}
    >
      {spans.map((span, index) => (
        <span
          key={index}
          style={{
            position: "absolute",
            left: "50%",
            width: "4px",
            height: "4px",
            background: "#fff",
            borderRadius: "50%",
            boxShadow:
              "0 0 0 4px rgba(255, 255, 255, 0.1), 0 0 0 8px rgba(255, 255, 255, 0.1), 0 0 20px rgba(255, 255, 255, 0.1)",
            animation: "animate 3s linear infinite",
            top: span.top,
            right: span.right,
            animationDuration: span.animationDuration,
          }}
        >
          <span
            style={{
              content: '""',
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              width: "300px",
              height: "1px",
              background: "linear-gradient(90deg, #fff, transparent)",
            }}
          />
        </span>
      ))}
      <style>
        {`@keyframes animateBg {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
          }
          @keyframes animate {
            0% {
              transform: rotate(300deg) translateX(0);
              opacity: 1;
            }
            70% { opacity: 1; }
            100% {
              transform: rotate(300deg) translateX(-1000px);
              opacity: 0;
            }
          }`}
      </style>
    </div>
  );
};

export default ShootingStars;
