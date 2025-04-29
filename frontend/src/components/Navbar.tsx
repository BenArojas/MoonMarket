import { Box, Stack, Badge, IconButton, Divider } from "@mui/material";
import {
  ArrowLeftRight,
  BriefcaseBusiness,
  Orbit,
  User,
  LogOut,
  Globe,
  ListPlus,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useThemeHook } from "@/contexts/ThemeContext";
import { useTheme, useMediaQuery } from "@mui/material";
import useLogout from "@/hooks/useLogOut";
import { FC } from "react";

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

interface NavItem {
  icon: React.ElementType;
  text?: string;
  badge?: number;
  onClick?: () => void;
  disabled?: boolean;
}

interface NavItemProps {
  item: NavItem;
  isMainNav?: boolean;
  isActive?: boolean;
}

const NavItem: FC<NavItemProps> = ({ item, isMainNav = false, isActive = false }) => {
  const theme = useTheme();
  const { icon: Icon, text, badge, onClick, disabled } = item;

  if (!text) {
    return (
      <IconButton onClick={onClick} color="inherit" disabled={disabled}>
        <Icon />
      </IconButton>
    );
  }

  return (
    <Box
      component={Link}
      to={text === "logout" ? "" : text}
      onClick={text === "logout" ? onClick : undefined}
      sx={{
        color: isActive ? theme.palette.primary.main : "inherit",
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
          <Icon color={isActive ? theme.palette.primary.main : "currentColor"} />
        </Badge>
      ) : (
        <Icon color={isActive ? theme.palette.primary.main : "currentColor"} />
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
  );
};

interface NavbarProps {
  friendRequestsCount: number;
}

const Navbar: FC<NavbarProps> = ({ friendRequestsCount }) => {
  const theme = useTheme();
  const { toggleTheme, mode } = useThemeHook();
  const { pathname } = useLocation();
  const handleLogout = useLogout();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const isSpacePage = pathname === "/space";

  const mainNavItems: NavItem[] = [
    { icon: Orbit, text: "space" },
    { icon: ArrowLeftRight, text: "transactions" },
    { icon: BriefcaseBusiness, text: "home" },
    { icon: ListPlus, text: "watchlist" },
    ...(isMobileScreen ? [] : [{ icon: Globe, text: "global" }]),
  ];

  const rightNavItems: NavItem[] = [
    {
      icon: mode === "dark" ? LightModeIcon : DarkModeIcon,
      onClick: isSpacePage ? undefined : toggleTheme,
      disabled: isSpacePage,
    },
    { icon: User, text: "profile", badge: friendRequestsCount },
    { icon: LogOut, text: "logout", onClick: handleLogout },
  ];

  return (
    <Stack
      direction={isMobileScreen ? "column" : "row"}
      justifyContent="space-between"
      sx={{ flex: 1, gap: 2 }}
    >
      {isMobileScreen ? (
        <>
          <Stack direction="row" gap={3} alignItems="center" justifyContent="center">
            {rightNavItems.map((item, index) => (
              <NavItem
                key={item.text || index}
                item={item}
                isActive={item.text ? pathname === `/${item.text}` : false}
              />
            ))}
          </Stack>
          <Divider />
          <Stack direction="row" gap={3} alignItems="center" justifyContent="center">
            {mainNavItems.map((item, index) => (
              <NavItem
                key={item.text || index}
                item={item}
                isMainNav
                isActive={pathname === `/${item.text}`}
              />
            ))}
          </Stack>
        </>
      ) : (
        <>
          <Stack direction="row" gap={3} alignItems="center">
            {mainNavItems.map((item, index) => (
              <NavItem
                key={item.text || index}
                item={item}
                isMainNav
                isActive={pathname === `/${item.text}`}
              />
            ))}
          </Stack>
          <Stack direction="row" gap={3} alignItems="center">
            {rightNavItems.map((item, index) => (
              <NavItem
                key={item.text || index}
                item={item}
                isActive={item.text ? pathname === `/${item.text}` : false}
              />
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
};

export default Navbar;