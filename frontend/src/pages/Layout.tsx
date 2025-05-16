import { getFriendRequestLength } from "@/api/friend";
import AccountSetUp from "@/components/AccountSetUp";
import Greetings from "@/components/Greetings";
import Sidebar from "@/components/Sidebar";
import { useUser } from '@/contexts/UserContext';
import "@/styles/global.css";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import {  useState, useEffect } from "react"; // Add useEffect
import { Outlet } from "react-router-dom";
import { PercentageChange } from "@/contexts/PercentageChangeContext";


const Layout: React.FC = () => {
  const [percentageChange, setPercentageChange] = useState<number>(0);
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const user = useUser();
  const username = user?.username || 'Guest';
  const isEnabled = user?.enabled || false; // Simplified to boolean

  // Automatically show modal when isEnabled is false
  const [showModal, setShowModal] = useState<boolean>(!isEnabled);

  const { data: friendRequestsLength } = useQuery({
    queryKey: ['friendRequestsLength'],
    queryFn: getFriendRequestLength,
  });

  // Update showModal when isEnabled changes
  useEffect(() => {
    setShowModal(!isEnabled);
  }, [isEnabled]);

  return (
    <PercentageChange.Provider
      value={{
        percentageChange,
        setPercentageChange,
      }}
    >
      <Box sx={{ display: "flex" }}>
        {isMobileScreen ? null : <Sidebar />}
        <Box
          className="layout"
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Greetings username={username} friendRequestsCount={friendRequestsLength} />
          {isEnabled ? (
            <Outlet context={friendRequestsLength} />
          ) : (
            <AccountSetUp
              isOpen={showModal}
              onClose={() => setShowModal(false)}
            />
          )}
        </Box>
      </Box>
    </PercentageChange.Provider>
  );
};

export default Layout;