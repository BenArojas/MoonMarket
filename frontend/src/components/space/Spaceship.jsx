import React, { useState, useEffect } from "react";
import HumanSpaceship from "/spaceship_4.png";
import styles from "./spaceship.module.css";
function Spaceship({ Radius, Percentage, centerX, centerY }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const minRadius = Radius + 50;
    const smallerRadius = ((100 - Percentage) / 100) * Radius + 100;
    console.log(smallerRadius);

    const randomAngle = Math.random() * 2 * Math.PI;

    const x = centerX + smallerRadius * Math.cos(randomAngle);
    const y = centerY + smallerRadius * Math.sin(randomAngle);

    setPosition({ x, y });
  }, [centerX, centerY, Radius, Percentage]);

  return (
    <div
      className={styles.spaceshipContainer}
      style={{
        "--postionX": position.x + "px",
        "--postionY": position.y + "px",
      }}
    >
      <div className={styles.container}>
        <img
          className={styles.spaceship}
          draggable={false}
          src={HumanSpaceship}
          alt="Spaceship"
          style={{
            width: "100px",
          }}
        />
        <div className={styles.portal} />
      </div>
    </div>
  );
}

export default Spaceship;
