import { Box, Stack, Badge, IconButton, Divider } from "@mui/material";
import {
  ArrowLeftRight,
  BriefcaseBusiness,
  Orbit,
  User,
  LogOut, Globe
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useThemeHook } from "@/contexts/ThemeContext";
import { useTheme, useMediaQuery } from "@mui/material";
import useLogout from '@/hooks/useLogOut';

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function Navbar({ friendRequestsCount }) {
  const theme = useTheme();
  const { toggleTheme, mode } = useThemeHook();
  const { pathname } = useLocation();
  const handleLogout = useLogout();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const isSpacePage = pathname === "/space";
  const mainNavItems = [
    { icon: Orbit, text: "space" },
    { icon: ArrowLeftRight, text: "transactions" },
    { icon: BriefcaseBusiness, text: "home" },
  ];
  if (!isMobileScreen) mainNavItems.push({ icon: Globe, text: "global" });
  const rightNavItems = [
    {
      icon: mode === "dark" ? LightModeIcon : DarkModeIcon,
      onClick: isSpacePage ? null : toggleTheme,
      disabled: isSpacePage,
    },
    { icon: User, text: "profile", badge: friendRequestsCount },
    { icon: LogOut, text: "logout", onClick: handleLogout },
  ];

  const renderNavItem = (item, index, isMainNav = false) => {
    const { icon: Icon, text, badge, onClick } = item;
    
    return text ? (
      <Box
        component={Link}
        to={text === "logout" ? "" : text}
        onClick={text === "logout" ? onClick : undefined}
        key={text || index}
        sx={{
          color: pathname === `/${text}` ? theme.palette.primary.main : "inherit",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 0.5,
          cursor: "pointer",
          borderRadius: "8px",
          p: 1,
          transition: "all 0.3s ease",
          ...(isMainNav && {
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              "& .nav-text": {
                opacity: 1,
                width: "auto",
                marginLeft: 1,
              },
            },
          }),
        }}
      >
        {badge ? (
          <Badge badgeContent={badge} color="primary">
            <Icon
              color={
                pathname === `/${text}` ? theme.palette.primary.main : "currentColor"
              }
            />
          </Badge>
        ) : (
          <Icon
            color={
              pathname === `/${text}` ? theme.palette.primary.main : "currentColor"
            }
          />
        )}
        {isMainNav ? (
          <Box
            className="nav-text"
            sx={{
              opacity: 0,
              width: 0,
              overflow: "hidden",
              whiteSpace: "nowrap",
              transition: "all 0.3s ease",
              marginLeft: 1,
            }}
          >
            {capitalizeFirstLetter(text)}
          </Box>
        ) : (
          capitalizeFirstLetter(text)
        )}
      </Box>
    ) : (
      <IconButton key={index} onClick={onClick} color="inherit">
        <Icon />
      </IconButton>
    );
  };
  return (
    <Stack
      flexDirection={isMobileScreen ? "column" : "row"}
      justifyContent="space-between"
      sx={{
        flex: 1,
        gap: 2, 
      }}
    >
      {isMobileScreen ? (
        <>
          <Stack flexDirection="row" gap={3} alignItems="center" justifyContent="center">
            {rightNavItems.map((item, index) => renderNavItem(item, index))}
          </Stack>
          <Divider />
          <Stack flexDirection="row" gap={3} alignItems="center" justifyContent="center">
            {mainNavItems.map((item, index) => renderNavItem(item, index, true))}
          </Stack>
        </>
      ) : (
        <>
          <Stack flexDirection="row" gap={3} alignItems="center">
            {mainNavItems.map((item, index) => renderNavItem(item, index, true))}
          </Stack>
          <Stack flexDirection="row" gap={3} alignItems="center">
            {rightNavItems.map((item, index) => renderNavItem(item, index))}
          </Stack>
        </>
      )}
    </Stack>
  );
}

export default Navbar;