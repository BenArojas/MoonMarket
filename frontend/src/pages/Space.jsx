import React, { useState, useEffect, useRef } from "react";
import Starfield from "react-starfield";
import "@/styles/moon.css";
import Moon from "@/components/space/Moon";
import SpaceshipsFleet from "@/components/space/SpaceshipsFleet";

function Space() {
  const galaxy = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [radius, setRadius] = useState(0);
  // const moonWidth = 150 / 2;
  useEffect(() => {
    const updateDimensions = () => {
      if (galaxy.current) {
        const { clientWidth, clientHeight } = galaxy.current;
        setDimensions({ width: clientWidth, height: clientHeight });
        setRadius((Math.min(clientWidth, clientHeight) / 2) * 0.70); // 45% of the smaller dimension
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;

  const spaceships = [
    { percentage: 40, value: "10000" },
    { percentage: 40, value: "20000" },
    { percentage: 80, value: "5000" },
  ];

  return (
    <div className="space-container" ref={galaxy}>
      <Starfield
        starCount={3000}
        starColor={[255, 255, 255]}
        speedFactor={0.08}
        backgroundColor="black"
      />

      {/* circle boundaries */}
      {/* <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="2"
        />
      </svg> */}
      <SpaceshipsFleet centerX={centerX} centerY={centerY} radius={radius} spaceships={spaceships}/>
      <Moon centerX={centerX} centerY={centerY} />
    </div>
  );
}

export default Space;
