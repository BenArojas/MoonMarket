import Greetings from "@/components/Greetings";
import Sidebar from "@/components/Sidebar";
import { PercentageChange } from "@/contexts/PercentageChangeContext";
import "@/styles/global.css";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useState } from "react"; // Add useEffect
import { Outlet } from "react-router-dom";


const Layout: React.FC = () => {
  const [percentageChange, setPercentageChange] = useState<number>(0);
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const username =  'Guest';


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
          <Greetings username={username}  />
            <Outlet />
        </Box>
      </Box>
    </PercentageChange.Provider>
  );
};

export default Layout;