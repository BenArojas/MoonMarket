import React from 'react';
import HumanSpaceship from '/spaceship_4-cropped.png';
import styles from './spaceship.module.css';
import Hologram from '@/components/space/Hologram';

function Spaceship({
  isActive,
  onClick,
  data,
}) {
  const handleClick = () => {
    onClick();
  };

  return (
    <div
      className={styles.spaceshipContainer}
      onClick={handleClick}
      aria-selected={isActive}
    >
      <img
        className={styles.spaceship}
        draggable={false}
        src={HumanSpaceship}
        alt="Spaceship"
        style={{ width: '50px', height: '50px' }}
      />
      <div className={styles.portal} />
      {isActive && (
        <Hologram
          isActive={isActive}
          showHologram={true}
          data={data}
          Percentage={data.portfolio_value_change_percentage}
        />
      )}
    </div>
  );
}

export default Spaceship;