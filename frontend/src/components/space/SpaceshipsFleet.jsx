import React, { useState } from "react";
import Spaceship from "@/components/space/Spaceship";

function SpaceshipsFleet({ spaceships, centerX, centerY, radius }) {
  const [activeSpaceship, setActiveSpaceship] = useState(null);
  // console.log("spaceships: " , spaceships)

  const handleSpaceshipClick = (index) => {
    if (activeSpaceship === null) {
      setActiveSpaceship(index);
    }
  };

  const handleCloseHologram = () => {
    setActiveSpaceship(null);
  };

  const isHologramMode = activeSpaceship !== null;

  return (
    <div className="spaceship-fleet">
      {spaceships.map((spaceship, index) => (
        <Spaceship
          key={index}
          centerX={centerX}
          centerY={centerY}
          Radius={radius}
          Percentage={spaceship.portfolio_value_change_percentage}
          data={spaceship}
          isActive={activeSpaceship === index}
          onClick={() => handleSpaceshipClick(index)}
          onCloseHologram={handleCloseHologram}
          isHologramMode={isHologramMode}
        />
      ))}
    </div>
  );
}

export default SpaceshipsFleet;