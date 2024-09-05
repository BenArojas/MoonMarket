import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import HumanSpaceship from '/spaceship_4-cropped.png';
import styles from './spaceship.module.css';
import Hologram from '@/components/space/Hologram';

function Spaceship({
  Radius,
  Percentage,
  centerX,
  centerY,
  isActive,
  onClick,
  onCloseHologram,
  isHologramMode,
  data,
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
      transition: { duration: 1.5, ease: 'easeInOut' },
    });
    return new Promise((resolve) => setTimeout(resolve, 100));
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
        transition: { duration: 1, ease: 'easeInOut' },
      });
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

  const ariaProps = { 'aria-selected': isActive && showHologram };

  return (
    <motion.div
      className={styles.spaceshipContainer}
      animate={controls}
      onClick={handleClick}
      {...ariaProps}
    >
      <img
        className={styles.spaceship}
        draggable={false}
        src={HumanSpaceship}
        alt="Spaceship"
        style={{ width: '100px' }}
      />
      <div className={styles.portal} />
      <Hologram
        isActive={isActive}
        showHologram={showHologram}
        data={data}
        onClose={handleCloseHologram}
        Percentage={Percentage}
      />
    </motion.div>
  );
}

export default Spaceship;