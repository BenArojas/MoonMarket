import React, { useState, useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import HumanSpaceship from "/spaceship_4.png";
import styles from "./spaceship.module.css";
import ReactDOM from "react-dom";



function Spaceship({
  Radius,
  Percentage,
  centerX,
  centerY,
  isActive,
  onClick,
  onCloseHologram,
  isHologramMode,
}) {
  const FIXED_DESTINATION_X = 100;
  const FIXED_DESTINATION_Y = window.innerHeight / 2 - 150;
  const [showHologram, setShowHologram] = useState(false);
  const [angle, setAngle] = useState(Math.random() * 2 * Math.PI);
  const controls = useAnimation();
  const originalPosition = useRef({ x: 0, y: 0 });
  const animationRef = useRef(null);

  const smallerRadius = ((100 - Percentage) / 100) * Radius + 150;

  const updatePosition = () => {
    const x = centerX + smallerRadius * Math.cos(angle);
    const y = centerY + smallerRadius * Math.sin(angle);
    controls.set({ x, y });
  };

  useEffect(() => {
    updatePosition();
  }, [angle]);

  useEffect(() => {
    const animateSpaceship = () => {
      if (!isHologramMode && !isActive) {
        setAngle((prevAngle) => (prevAngle + 0.005) % (2 * Math.PI));
      }
      animationRef.current = requestAnimationFrame(animateSpaceship);
    };

    animationRef.current = requestAnimationFrame(animateSpaceship);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isHologramMode, isActive]);

  useEffect(() => {
    if (isActive) {
      const x = centerX + smallerRadius * Math.cos(angle);
      const y = centerY + smallerRadius * Math.sin(angle);
      originalPosition.current = { x, y };
      handleAnimation().then(() => {
        setShowHologram(true);
      });
    } else {
      setShowHologram(false);
    }
  }, [isActive]);

  const handleAnimation = async () => {
    await controls.start({
      x: [originalPosition.current.x, centerX, 0, centerX, FIXED_DESTINATION_X],
      y: [
        originalPosition.current.y,
        centerY - 200,
        centerY,
        centerY + 200,
        FIXED_DESTINATION_Y,
      ],
      transition: { duration: 1.5, ease: "easeInOut" },
    });
    // No need for additional x animation since we're already at the final X position
    return new Promise((resolve) => setTimeout(resolve, 100)); // Small delay for stability
  };

  const handleClick = () => {
    if (!isHologramMode) {
      onClick();
    }
  };

  const handleCloseHologram = () => {
    setShowHologram(false);
    const returnToOrbit = async () => {
      await controls.start({
        x: originalPosition.current.x,
        y: originalPosition.current.y,
        transition: { duration: 1, ease: "easeInOut" },
      });
      // Resume the orbital motion
      setAngle(
        Math.atan2(
          originalPosition.current.y - centerY,
          originalPosition.current.x - centerX
        )
      );
    };
    returnToOrbit();
    onCloseHologram();
  };

  const renderHologram = () => {
    if (isActive && showHologram) {
      return ReactDOM.createPortal(
        <div className={styles.hologramWrapper}>
          <motion.div
            className={styles.hologramScreen}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1] }}
            transition={{ duration: 0.5 }}
          >
            <div className={styles.hologramImage}></div>
            <div className={styles.screenOverlay}></div>
            <div className={styles.hologramContent}>
              <button
                className={styles.closeButton}
                onClick={handleCloseHologram}
              >
                X
              </button>
              {/* Hologram content goes here */}
              <p>Greetings, Earthling!</p>
            </div>
          </motion.div>
        </div>,
        document.querySelector('.space-container')
      );
    }
    return null;
  };

  return (
    <motion.div
      className={styles.spaceshipContainer}
      animate={controls}
      onClick={handleClick}
    >
      <div className={styles.container}>
        <img
          className={styles.spaceship}
          draggable={false}
          src={HumanSpaceship}
          alt="Spaceship"
          style={{ width: "100px" }}
        />
        <div className={styles.portal} />
      </div>
      {renderHologram()}
    </motion.div>
  );
}

export default Spaceship;
