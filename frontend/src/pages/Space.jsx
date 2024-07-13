import React from 'react'
import Starfield from 'react-starfield';
import "@/styles/moon.css"
import HumanSpaceship from "/Human_spaceship.png";

const Moon = () => {
  return (
    // <div className="moon">
    //css made moon
    //   <div className="crater crater-1"></div>
    //   <div className="crater crater-2"></div>
    //   <div className="crater crater-3"></div>
    // </div>
    <div className='moon-container'>
      <img
        src="/RealMoon.png"
        alt="Detailed moon"
        className="moon"
      />
    </div>
  );
};

const Spaceship = ({ percentage, angle }) => {
  const [showTooltip, setShowTooltip] = React.useState(false);

  const moonCenterX = 50;
  const moonCenterY = 45;
  const moonRadius = 6;
  const maxDistance = 40;

  // New distance calculation
  const distance = moonRadius + (maxDistance * (100 - percentage) / 100);

  const x = moonCenterX + distance * Math.cos(angle);
  const y = moonCenterY + distance * Math.sin(angle);

  const rotation = (Math.atan2(moonCenterY - y, moonCenterX - x) * 180 / Math.PI) + 90;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%)`,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <img
        draggable={false}
        src={HumanSpaceship}
        style={{
          width: '80px',
          height: "auto",
          transform: `rotate(${rotation}deg)`,
        }}
      />
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '5px',
            fontSize: '14px',
            whiteSpace: 'nowrap',
          }}
        >
          {percentage.toFixed(2)}%
        </div>
      )}
    </div>
  );
};

const DistanceCircles = () => {
  const circles = [];
  for (let i = 1; i <= 3; i++) {
    const radius = 5 + (40 * i / 3); // 5% is moon radius, 40% is max distance
    circles.push(
      <circle
        key={i}
        cx="50%"
        cy="45%"
        r={`${radius}%`}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />
    );
  }
  return (
    <svg className="distance-circles" style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}>
      {circles}
    </svg>
  );
};

function Space() {
  const [spaceships, setSpaceships] = React.useState([]);

  const isValidPosition = (newShip, existingShips) => {
    for (let ship of existingShips) {
      const angleDiff = Math.abs(newShip.angle - ship.angle);
      const percentageDiff = Math.abs(newShip.percentage - ship.percentage);

      // Increased minimum distance
      if (angleDiff < 0.5 && percentageDiff < 20) {
        return false;
      }
    }
    return true;
  };

  React.useEffect(() => {
    const newSpaceships = [];
    let attempts = 0;
    const maxAttempts = 100;

    while (newSpaceships.length < 7 && attempts < maxAttempts) {
      const newShip = {
        percentage: Math.random() * 100, // from 0% to 100%
        angle: Math.random() * 2 * Math.PI,
      };

      if (isValidPosition(newShip, newSpaceships)) {
        newSpaceships.push(newShip);
      }
      attempts++;
    }

    setSpaceships(newSpaceships);
  }, []);

  return (
    <div className="space-container">
      <Starfield
        starCount={3000}
        starColor={[255, 255, 255]}
        speedFactor={0.08}
        backgroundColor="black"
      />
      <DistanceCircles />
      <Moon />
      {spaceships.map((ship, index) => (
        <Spaceship key={index} percentage={ship.percentage} angle={ship.angle} />
      ))}
    </div>
  )
}

export default Space