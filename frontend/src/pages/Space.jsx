import { getFriendsAndUserHoldings } from "@/api/friend";
import { getUsersList } from "@/api/user";
import FriendsSideBar from "@/components/FriendsSideBar";
import Moon from "@/components/space/Moon";
import Spaceship from "@/components/space/Spaceship";
import OrbitingCircles from "@/components/ui/orbiting-circles";
import { useThemeHook } from "@/contexts/ThemeContext";
import "@/styles/space.css";
import { useMediaQuery, useTheme } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import Starfield from "react-starfield";


const INITIAL_SPACESHIP_COUNT = 6;

function Space() {
  const theme = useTheme();
  const { forceDarkMode } = useThemeHook();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const galaxy = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [activeSpaceship, setActiveSpaceship] = useState(null);
  const queryClient = useQueryClient();

  const { data: usersWithHoldingsData, isPending: usersWithHoldingsLoading } = useQuery({
    queryKey: ["usersHoldings"],
    queryFn: () => getFriendsAndUserHoldings(),
  });

  const { data: usersListData, isPending: usersListLoading } = useQuery({
    queryKey: ["usersList"],
    queryFn: () => getUsersList(),
  });

  useEffect(() => {
    forceDarkMode();
  }, [forceDarkMode]);

  useEffect(() => {
    const updateDimensions = () => {
      if (galaxy.current) {
        const { clientWidth, clientHeight } = galaxy.current;
        setDimensions({ width: clientWidth, height: clientHeight });
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

  return (
    <div className="page">
      <div
        className={`floating-sidebar bg-[rgba(255,255,255,0.15)] backdrop-blur-0 rounded-[50px] border border-[rgba(255,255,255,0.18)] shadow-[0_8px_32px_0_rgba(255,255,255,0.37)] ${isMobileScreen
            ? 'w-[48px] h-[30vh] md:w-[60px] md:h-[40vh] mb-[5vh] md:mt-[5px]'
            : 'w-[60px] h-[40vh] mt-[5px]'
          } ml-[5px]`}
      >
        {!usersListLoading && usersListData && (
          <FriendsSideBar
            friends={usersListData}
            onAvatarClick={handleSpaceshipActivation}
            activeSpaceship={activeSpaceship}
          />
        )}
      </div>
      <div className="space-container" ref={galaxy}>
        <Starfield
          starCount={500}
          starColor={[255, 255, 255]}
          speedFactor={0.15}
          backgroundColor="black"
        />
        <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg md:shadow-xl">
          <Moon
            centerX={centerX}
            centerY={centerY}
            size={isMobileScreen ? 100 : 200}
          />
          {!usersWithHoldingsLoading && usersWithHoldingsData && (
            <>
              {(() => {
                const categorizedFriends = categorizeFriends(usersWithHoldingsData);
                return (
                  <>
                    {/* High Performers (70% and above) */}
                    {categorizedFriends.highPerformers.length > 0 && <OrbitingCircles
                      className="size-[24px] border-none bg-transparent"
                      duration={30}
                      delay={20}
                      radius={isMobileScreen ? 100 : 150}
                    >
                      {categorizedFriends.highPerformers.map(friend => (
                        <Spaceship
                          key={friend.id}
                          data={friend}
                          isActive={activeSpaceship === friend.id}
                          onClick={() => handleSpaceshipActivation(friend.id)}
                        />
                      ))}
                    </OrbitingCircles>}

                    {/* Moderate Performers (20% to 70%) */}
                    {categorizedFriends.moderatePerformers.length > 0 && <OrbitingCircles
                      className="size-[24px] border-none bg-transparent"
                      duration={25}
                      delay={10}
                      radius={isMobileScreen ? 150 : 250}
                      reverse
                    >
                      {categorizedFriends.moderatePerformers.map(friend => (
                        <Spaceship
                          key={friend.id}
                          data={friend}
                          isActive={activeSpaceship === friend.id}
                          onClick={() => handleSpaceshipActivation(friend.id)}
                        />
                      ))}
                    </OrbitingCircles>}

                    {/* Low Performers (below 20%) */}
                    {categorizedFriends.lowPerformers.length > 0 && <OrbitingCircles
                      className="size-[24px] border-none bg-transparent"
                      duration={20}
                      delay={15}
                      radius={isMobileScreen ? 200 : 350}
                    >
                      {categorizedFriends.lowPerformers.map(friend => (
                        <Spaceship
                          key={friend.id}
                          data={friend}
                          isActive={activeSpaceship === friend.id}
                          onClick={() => handleSpaceshipActivation(friend.id)}
                        />
                      ))}
                    </OrbitingCircles>}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Space;