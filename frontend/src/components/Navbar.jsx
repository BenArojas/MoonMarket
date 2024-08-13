import { Box, Stack, Badge } from "@mui/material";
import { ArrowLeftRight, BriefcaseBusiness, Orbit, User, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useTheme } from "@/contexts/ThemeContext";

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function Navbar({ friendRequests }) {

  const { toggleTheme, theme } = useTheme()
  console.log(theme)
  const mode = theme.palette.mode;

  const { pathname } = useLocation();
  const navItems = [
    { icon: mode === 'dark' ? DarkModeIcon : LightModeIcon, text: mode === 'dark' ? 'darkMode' : 'lightMode', onClick: toggleTheme },
    { icon: Orbit, text: "space" },
    { icon: BriefcaseBusiness, text: "portfolio" },
    { icon: ArrowLeftRight, text: "transactions" },
    {
      icon: User,
      text: "profile",
      badge: friendRequests.length,
      // onClick: friendRequests.length ? handleClick : null
    },
    { icon: LogOut, text: "logout" },
  ];



  return (
    <Stack flexDirection={"row"} gap={6}>
      {navItems.map(({ icon: Icon, text, badge, onClick }) => (
        <Box
          component={onClick ? 'div' : Link}
          to={onClick ? undefined : text}
          key={text}
          onClick={onClick}
          sx={{
            color: pathname === `/${text}` ? "#077e5d" : "inherit",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 1,
            cursor: "pointer",
          }}
        >
          {badge ? (
            <Badge badgeContent={badge} color="primary">
              <Icon
                color={pathname === `/${text}` ? "#077e5d" : "currentColor"}
              />
            </Badge>
          ) : (
            <Icon
              color={pathname === `/${text}` ? "#077e5d" : "currentColor"}
            />
          )}
          {capitalizeFirstLetter(text)}
        </Box>
      ))}
    </Stack>
  );
}

export default Navbar;
