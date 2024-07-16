import React, { useState, useEffect } from "react";
import HumanSpaceship from "/spaceship_4.png";
import styles from "./spaceship.module.css";

function Spaceship({ Radius, Percentage, centerX, centerY }) {
  const [angle, setAngle] = useState(Math.random() * 2 * Math.PI);

  useEffect(() => {
    let animationFrameId;

    const animateSpaceship = () => {
      setAngle((prevAngle) => (prevAngle + 0.005) % (2 * Math.PI));
      animationFrameId = requestAnimationFrame(animateSpaceship);
    };

    animationFrameId = requestAnimationFrame(animateSpaceship);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const smallerRadius = ((100 - Percentage) / 100) * Radius + 150;
  const x = centerX + smallerRadius * Math.cos(angle);
  const y = centerY + smallerRadius * Math.sin(angle);

  return (
    <div
      className={styles.spaceshipContainer}
      style={{
        transform: `translate(${x}px, ${y}px)`, // Use transform for smoother animations
        transition: "transform 50ms linear",
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
