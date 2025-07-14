import { useAuth } from "@/contexts/AuthContext";
import { useThemeHook } from "@/contexts/ThemeContext";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import {
  Box,
  Divider,
  IconButton,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  ArrowLeftRight,
  BriefcaseBusiness,
  Globe,
  ListPlus,
  LogOut,
  User,
  ScanSearch,
} from "lucide-react";
import { FC } from "react";
import { Link, useLocation } from "react-router-dom";
import { Paths } from "@/constants/paths";

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// --- 1. The NavItem interface is updated for clarity ---
// It now separates the navigation `path` from the display `label`.
interface NavItemType {
  icon: React.ElementType;
  label: string;
  path?: string; // The absolute path for navigation
  onClick?: () => void;
  disabled?: boolean;
}

interface NavItemProps {
  item: NavItemType;
  isMainNav?: boolean;
  isActive?: boolean;
}

// --- 2. The NavItem component is updated to use `path` and `label` ---
const NavItem: FC<NavItemProps> = ({
  item,
  isMainNav = false,
  isActive = false,
}) => {
  const theme = useTheme();
  const { icon: Icon, label, path, onClick, disabled } = item;

  // Handle items that are just buttons (like theme toggle)
  if (!path && onClick) {
    return (
      <IconButton onClick={onClick} color="inherit" disabled={disabled}>
        <Icon />
      </IconButton>
    );
  }

  return (
    <Box
      component={Link}
      to={path || ""} // Use the `path` for the `to` prop
      onClick={onClick}
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
        textDecoration: "none", // Ensure link has no underline
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
      <Icon color={isActive ? theme.palette.primary.main : "currentColor"} />
      {/* The display text now comes from the `label` property */}
      <Box
        className="nav-text"
        sx={{
          opacity: isMainNav ? 0 : 1,
          width: isMainNav ? 0 : "auto",
          overflow: "hidden",
          whiteSpace: "nowrap",
          transition: "all 0.3s ease",
          marginLeft: isMainNav ? 1 : 0,
        }}
      >
        {capitalizeFirstLetter(label)}
      </Box>
    </Box>
  );
};

const Navbar = () => {
  const theme = useTheme();
  const { toggleTheme, mode } = useThemeHook();
  const { pathname } = useLocation();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  // --- 3. The item arrays now use the new `NavItemType` structure ---
  const mainNavItems: NavItemType[] = [
    { icon: BriefcaseBusiness, label: "Home", path: Paths.protected.app.home },
    { icon: ArrowLeftRight, label: "Transactions", path: Paths.protected.app.transactions, },
    { icon: ListPlus, label: "Watchlist", path: Paths.protected.app.watchlist },
    { icon: ScanSearch, label: "Scanner", path: Paths.protected.app.scanner },
    ...(!isMobileScreen ? [{ icon: Globe, label: "Global", path: Paths.protected.app.global }] : []),
  ];

  const rightNavItems: NavItemType[] = [
    {
      icon: mode === "dark" ? LightModeIcon : DarkModeIcon,
      label: "Toggle Theme", // A label is good for accessibility
      onClick: toggleTheme,
    },
    { icon: User, label: "Profile", path: Paths.protected.app.profile },
    { icon: LogOut, label: "Logout", onClick: handleLogout },
  ];

  // --- 4. The rendering logic is simplified ---
  // No more `getFullPath` or complex `renderNavItem` function needed.
  return (
    <Stack
      direction={isMobileScreen ? "column" : "row"}
      justifyContent="space-between"
      sx={{ flex: 1, gap: 2 }}
    >
      {isMobileScreen ? (
        <>
          <Stack direction="row" gap={3} alignItems="center" justifyContent="center">
            {rightNavItems.map((item) => (
              <NavItem
                key={item.label}
                item={item}
                // The `isActive` check is now a simple, direct comparison
                isActive={!!item.path && pathname === item.path}
              />
            ))}
          </Stack>
          <Divider />
          <Stack direction="row" gap={3} alignItems="center" justifyContent="center">
            {mainNavItems.map((item) => (
              <NavItem
                key={item.label}
                item={item}
                isMainNav
                isActive={!!item.path && pathname === item.path}
              />
            ))}
          </Stack>
        </>
      ) : (
        <>
          <Stack direction="row" gap={3} alignItems="center">
            {mainNavItems.map((item) => (
              <NavItem
                key={item.label}
                item={item}
                isMainNav
                isActive={!!item.path && pathname === item.path}
              />
            ))}
          </Stack>
          <Stack direction="row" gap={3} alignItems="center">
            {rightNavItems.map((item) => (
              <NavItem
                key={item.label}
                item={item}
                isActive={!!item.path && pathname === item.path}
              />
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
};

export default Navbar;