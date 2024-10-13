import React from "react";
import Spaceship from "@/components/space/Spaceship";

function SpaceshipsFleet({ spaceships, centerX, centerY, radius, activeSpaceship, onSpaceshipClick }) {
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
          onClick={() => onSpaceshipClick(index)}
          onCloseHologram={() => onSpaceshipClick(null)}
          isHologramMode={isHologramMode}
        />
      ))}
    </div>
  );
}

export default SpaceshipsFleet;