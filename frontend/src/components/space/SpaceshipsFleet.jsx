  import React from "react";
  import Spaceship from "@/components/space/Spaceship";

  function SpaceshipsFleet({ spaceships, activeSpaceship, onSpaceshipClick }) {
    return (
      <>
        {spaceships.map((spaceship) => (
          <Spaceship
            key={spaceship.id}
            data={spaceship}
            isActive={activeSpaceship === spaceship.id}
            onClick={() => onSpaceshipClick(spaceship.id)}

          />
        ))}
      </>
    );
  }

  export default SpaceshipsFleet;