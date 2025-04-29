import HumanSpaceship from '/spaceship_4-cropped.png';
import styles from './spaceship.module.css';
import Hologram from '@/components/space/Hologram';
import { SpaceshipData } from '@/pages/Space';

interface SpaceshipProps{
  isActive: boolean;
  onClick: ()=> void;
  data: SpaceshipData
}
function Spaceship({
  isActive,
  onClick,
  data,
}: SpaceshipProps) {
  const handleClick = () => {
    onClick();
  };
  return (
    <div
      className={styles.spaceshipContainer}
      aria-selected={isActive}
    >
      <img
        className={styles.spaceship}
        draggable={false}
        src={HumanSpaceship}
        alt="Spaceship"
        style={{ width: '40px', height: '35px' }}
        onClick={handleClick}
      />
      <div className={styles.portal} />
      {isActive && (
        <Hologram
          data={data}
          Percentage={data.portfolio_value_change_percentage}
          handleExit = {onClick}
        />
      )}
    </div>
  );
}

export default Spaceship;