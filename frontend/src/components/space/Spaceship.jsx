import React, { useState, useEffect } from "react";
import HumanSpaceship from "/spaceship_4.png";

function Spaceship({ Radius, Percentage, centerX, centerY }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const minRadius = Radius + 50;
    // Calculate the radius of the smaller circle
    const smallerRadius = (((100 - Percentage) / 100) * Radius)+ 100;
    console.log(smallerRadius)

    // Generate a random angle
    const randomAngle = Math.random() * 2 * Math.PI;

    // Calculate the position on the smaller circle
    const x = centerX + smallerRadius * Math.cos(randomAngle);
    const y = centerY + smallerRadius * Math.sin(randomAngle);

    setPosition({ x, y });
  }, [centerX, centerY, Radius, Percentage]);

  return (
    <div
      className="spaceship-container"
      style={{
        transform: "translate(-50%,-50%)",
        position: "absolute",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1,
      }}
    >
      <img
        draggable={false}
        src={HumanSpaceship}
        alt="Spaceship"
        style={{
          width: "100px",
        }}
      />
    </div>
  );
}

export default Spaceship;
