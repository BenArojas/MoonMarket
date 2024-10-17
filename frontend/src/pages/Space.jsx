import React, { useState, useEffect, useRef, Suspense } from "react";
import Starfield from "react-starfield";
import "@/styles/space.css";
import Moon from "@/components/space/Moon";
import SpaceshipsFleet from "@/components/space/SpaceshipsFleet";
import { getFriendsAndUserHoldings } from "@/api/friend";
import { Await, defer, useLoaderData } from "react-router-dom";
import FriendsSideBar from "@/components/FriendsSideBar";
import { useThemeHook } from "@/contexts/ThemeContext";
import OrbitingCircles from "@/components/ui/orbiting-circles";

export const loader = async () => {
  const friends = getFriendsAndUserHoldings();
  return defer({ friends });
};

function Space() {
  const data = useLoaderData();
  const { forceDarkMode } = useThemeHook();
  const galaxy = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [radius, setRadius] = useState(0);
  const [activeSpaceship, setActiveSpaceship] = useState(null);

  useEffect(() => {
    forceDarkMode();
  }, [forceDarkMode]);

  useEffect(() => {
    const updateDimensions = () => {
      if (galaxy.current) {
        const { clientWidth, clientHeight } = galaxy.current;
        setDimensions({ width: clientWidth, height: clientHeight });
        setRadius((Math.min(clientWidth, clientHeight) / 2) * 0.60);
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;

  const handleSpaceshipActivation = (id) => {
    setActiveSpaceship((prevActiveSpaceship) => {
      return prevActiveSpaceship === id ? null : id;
    });
  };

  const categorizeFriends = (friends) => {
    return friends.reduce((acc, friend) => {
      const percentage = friend.portfolio_value_change_percentage;

      if (percentage >= 70) {
        acc.highPerformers.push(friend);
      } else if (percentage >= 20 && percentage < 70) {
        acc.moderatePerformers.push(friend);
      } else {
        acc.lowPerformers.push(friend);
      }

      return acc;
    }, {
      highPerformers: [],
      moderatePerformers: [],
      lowPerformers: []
    });
  };

  const renderSpaceships = (friends, radius) => (
    <OrbitingCircles
      className="size-[30px] border-none bg-transparent"
      duration={30}
      delay={20}
      radius={radius}
    >
      <SpaceshipsFleet
        spaceships={friends}
        activeSpaceship={activeSpaceship}
        onSpaceshipClick={handleSpaceshipActivation}
      />
    </OrbitingCircles>
  );

  return (
    <div className="page">
      <div className="floating-sidebar">
        <Suspense fallback={null}>
          <Await resolve={data.friends}>
            {(resolvedFriends) => (
              <FriendsSideBar
                friends={resolvedFriends}
                onAvatarClick={handleSpaceshipActivation}
                activeSpaceship={activeSpaceship}
              />
            )}
          </Await>
        </Suspense>
      </div>
      <div className="space-container" ref={galaxy}>
        <Starfield
          starCount={500}
          starColor={[255, 255, 255]}
          speedFactor={0.15}
          backgroundColor="black"
        />
        <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg md:shadow-xl">
          <Moon centerX={centerX} centerY={centerY} />

          {/* High Performers (70% and above) */}
          <OrbitingCircles
            className="size-[30px] border-none bg-transparent"
            duration={30}
            delay={20}
            radius={150}
          >
            <Suspense fallback={null}>
              <Await resolve={data.friends}>
                {(resolvedFriends) => {
                  const categorizedFriends = categorizeFriends(resolvedFriends);
                  return (
                    <SpaceshipsFleet
                      spaceships={categorizedFriends.highPerformers}
                      activeSpaceship={activeSpaceship}
                      onSpaceshipClick={handleSpaceshipActivation}
                    />
                  );
                }}
              </Await>
            </Suspense>
          </OrbitingCircles>

          {/* Moderate Performers (20% to 70%) */}
          <OrbitingCircles
            className="size-[30px] border-none bg-transparent"
            duration={25}
            delay={10}
            radius={250}
          >
            <Suspense fallback={null}>
              <Await resolve={data.friends}>
                {(resolvedFriends) => {
                  const categorizedFriends = categorizeFriends(resolvedFriends);
                  return (
                    <SpaceshipsFleet
                      spaceships={categorizedFriends.moderatePerformers}
                      activeSpaceship={activeSpaceship}
                      onSpaceshipClick={handleSpaceshipActivation}
                    />
                  );
                }}
              </Await>
            </Suspense>
          </OrbitingCircles>

          {/* Low Performers (below 20%) */}
          <OrbitingCircles
            className="size-[30px] border-none bg-transparent"
            duration={20}
            delay={15}
            radius={350}
          >
            <Suspense fallback={null}>
              <Await resolve={data.friends}>
                {(resolvedFriends) => {
                  const categorizedFriends = categorizeFriends(resolvedFriends);
                  return (
                    <SpaceshipsFleet
                      spaceships={categorizedFriends.lowPerformers}
                      activeSpaceship={activeSpaceship}
                      onSpaceshipClick={handleSpaceshipActivation}
                    />
                  );
                }}
              </Await>
            </Suspense>
          </OrbitingCircles>
        </div>
      </div>
    </div>
  );
}

export default Space;