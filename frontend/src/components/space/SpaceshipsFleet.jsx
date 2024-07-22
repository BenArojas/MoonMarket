import React from "react";
import Spaceship from "@/components/space/Spaceship";

function SpaceshipsFleet({ spaceships, centerX, centerY, radius }) {
  return (
    <div>
      {spaceships.map((spaceship, index) => (
        <Spaceship
          key={index}
          centerX={centerX}
          centerY={centerY}
          Radius={radius}
          Percentage={spaceship.portfolio_value_change_percentage}
        />
      ))}
    </div>
  );
}

export default SpaceshipsFleet;
