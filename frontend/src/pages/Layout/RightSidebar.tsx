import {
  ArrowLeftRight,
  BriefcaseBusiness,
  Globe,
  ListPlus,
  LogOut,
  Moon,
  ScanSearch,
  Sun,
  User,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { FC } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useThemeHook } from "@/contexts/ThemeContext";
import { Paths } from "@/constants/paths";

import { Box, IconButton, Tooltip, useTheme, useMediaQuery } from "@mui/material";

interface NavLinkProps {
  to?: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}

const NavLink: FC<NavLinkProps> = ({ to, icon: Icon, label, onClick, isActive }) => {
  const theme = useTheme();

  return (
    <Tooltip title={label} placement="left" arrow>
      <IconButton
        component={to ? Link : 'button'}
        to={to}
        onClick={onClick}
        sx={{
          color: isActive ? theme.palette.primary.contrastText : theme.palette.text.secondary,
          backgroundColor: isActive ? theme.palette.primary.main : 'transparent',
          '&:hover': {
            backgroundColor: isActive ? theme.palette.primary.dark : theme.palette.action.hover,
          },
        }}
      >
        <Icon size={22} />
      </IconButton>
    </Tooltip>
  );
};

export function RightSidebar() {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const { toggleTheme, mode } = useThemeHook();
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const mainNavItems = [
    { icon: BriefcaseBusiness, label: "Home", path: Paths.protected.app.home },
    { icon: ArrowLeftRight, label: "Transactions", path: Paths.protected.app.transactions },
    { icon: ListPlus, label: "Watchlist", path: Paths.protected.app.watchlist },
    { icon: ScanSearch, label: "Scanner", path: Paths.protected.app.scanner },
    ...(!isMobileScreen ? [{ icon: Globe, label: "Global", path: Paths.protected.app.global }] : []),
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Box
      component="aside"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: 65,
        borderLeft: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        py: 20,
        gap: 1.5,
      }}
    >
      <Box component="nav" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {mainNavItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            icon={item.icon}
            label={item.label}
            isActive={pathname === item.path}
          />
        ))}
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      <Box component="nav" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <NavLink
          onClick={toggleTheme}
          icon={mode === 'dark' ? Sun : Moon}
          label={mode === 'dark' ? "Light Mode" : "Dark Mode"}
        />
        <NavLink
          to={Paths.protected.app.profile}
          icon={User}
          label="Profile"
          isActive={pathname === Paths.protected.app.profile}
        />
        <NavLink
          onClick={handleLogout}
          icon={LogOut}
          label="Logout"
        />
      </Box>
    </Box>
  );
}