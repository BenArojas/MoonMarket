import { getFriendRequestLength } from "@/api/friend";
import AccountSetUp from "@/components/AccountSetUp";
import Greetings from "@/components/Greetings";
import Sidebar from "@/components/Sidebar";
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

  const username =  'Guest';


  const { data: friendRequestsLength } = useQuery({
    queryKey: ['friendRequestsLength'],
    queryFn: getFriendRequestLength,
  });



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
            <Outlet context={friendRequestsLength} />
        </Box>
      </Box>
    </PercentageChange.Provider>
  );
};

export default Layout;