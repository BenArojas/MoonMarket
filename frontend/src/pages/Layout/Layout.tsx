import Sidebar from "@/pages/Layout/Sidebar";
import { PercentageChange } from "@/contexts/PercentageChangeContext";
import "@/styles/global.css";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useState } from "react"; // Add useEffect
import { Outlet } from "react-router-dom";
import Greetings from "./Greetings";

const Layout: React.FC = () => {
  const [percentageChange, setPercentageChange] = useState<number>(0);
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("sm"));

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
          <Greetings />
          <Outlet />
        </Box>
      </Box>
    </PercentageChange.Provider>
  );
};

export default Layout;
