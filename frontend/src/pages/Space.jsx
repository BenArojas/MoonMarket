import React, { useState, useEffect, useRef, Suspense } from "react";
import Starfield from "react-starfield";
import "@/styles/space.css";
import Moon from "@/components/space/Moon";
import SpaceshipsFleet from "@/components/space/SpaceshipsFleet";
import { getFriendsAndUserHoldings } from "@/api/friend";
import { Await, defer, useLoaderData } from "react-router-dom";
import FriendsSideBar from "@/components/FriendsSideBar";
import { useTheme } from "@/contexts/ThemeContext";


export const loader = async () => {
  const friends = getFriendsAndUserHoldings();
  return defer({ friends });
};

function Space() {
  const data = useLoaderData();
  const { forceDarkMode } = useTheme();
  const galaxy = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [radius, setRadius] = useState(0);

  useEffect(() => {
    forceDarkMode();
  }, [forceDarkMode]);  

  useEffect(() => {
    const updateDimensions = () => {
      if (galaxy.current) {
        const { clientWidth, clientHeight } = galaxy.current;
        setDimensions({ width: clientWidth, height: clientHeight });
        setRadius((Math.min(clientWidth, clientHeight) / 2) * 0.60); // 60% of the smaller dimension
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;

  return (
    <div className="page">
      <div className="floating-sidebar">
        <Suspense fallback={null}>
          <Await resolve={data.friends}>
            {(resolvedFriends) => <FriendsSideBar friends={resolvedFriends} />}
          </Await>
        </Suspense>
      </div>
      <div className="space-container" ref={galaxy}>
        <Starfield
          starCount={4000}
          starColor={[255, 255, 255]}
          speedFactor={0.10}
          backgroundColor="black"
        />
        <Moon centerX={centerX} centerY={centerY} />
        <Suspense fallback={null}>
          <Await resolve={data.friends}>
            {(resolvedFriends) => (
              <SpaceshipsFleet
                centerX={centerX}
                centerY={centerY}
                radius={radius}
                spaceships={resolvedFriends}
              />
            )}
          </Await>
        </Suspense>
      </div>
    </div>
  );
}

export default Space;