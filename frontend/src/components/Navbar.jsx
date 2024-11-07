import { Box, Stack, Badge, IconButton } from "@mui/material";
import {
  ArrowLeftRight,
  BriefcaseBusiness,
  Orbit,
  User,
  LogOut, Globe
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useThemeHook } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthProvider"; 
import { useQueryClient } from "@tanstack/react-query"; 
import { useTheme } from "@mui/material";
import useLogout from '@/hooks/useLogOut';


function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function Navbar({ friendRequestsCount }) {
  const theme = useTheme();
  const { toggleTheme, mode } = useThemeHook();
  const { pathname } = useLocation();
  const handleLogout = useLogout();

  const isSpacePage = pathname === "/space";
  const mainNavItems = [
    { icon: Orbit, text: "space" },
    { icon: Globe, text: "global" },
    { icon: ArrowLeftRight, text: "transactions" },
    { icon: BriefcaseBusiness, text: "home" },
  ];
  const rightNavItems = [
    {
      icon: mode === "dark" ? LightModeIcon : DarkModeIcon,
      onClick: isSpacePage ? null : toggleTheme,
      disabled: isSpacePage,
    },
    { icon: User, text: "profile", badge: friendRequestsCount },
    { icon: LogOut, text: "logout", onClick: handleLogout }, // Add the logout handler here
  ];

  return (
    <Stack
      flexDirection="row"
      justifyContent="space-between"
      sx={{
        flex: 1,
      }}
    >
      <Stack flexDirection="row" gap={3} alignItems="center">
        {mainNavItems.map(({ icon: Icon, text }) => (
          <Box
            component={Link}
            to={text}
            key={text}
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
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "& .nav-text": {
                  opacity: 1,
                  width: "auto",
                  marginLeft: 1,
                },
              },
            }}
          >
            <Icon
              color={pathname === `/${text}` ? theme.palette.primary.main : "currentColor"}
            />
            <Box
              className="nav-text"
              sx={{
                opacity: 0,
                width: 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                transition: "all 0.3s ease",
              }}
            >
              {capitalizeFirstLetter(text)}
            </Box>
          </Box>
        ))}
      </Stack>

      <Stack flexDirection="row" gap={3} alignItems="center">
        {rightNavItems.map(({ icon: Icon, text, badge, onClick }, index) => (
          <Box key={text || index}>
            {text ? (
              <Box
                component={Link}
                to={text === "logout" ? "" : text} // Don't navigate on logout, just call the handler
                onClick={text === "logout" ? onClick : undefined} // Call onClick for logout
                sx={{
                  color: pathname === `/${text}` ? theme.palette.primary.main : "inherit",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 0.5,
                  cursor: "pointer",
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
                    color={pathname === `/${text}` ? theme.palette.primary.main : "currentColor"}
                  />
                )}
                {capitalizeFirstLetter(text)}
              </Box>
            ) : (
              <IconButton onClick={onClick} color="inherit">
                <Icon />
              </IconButton>
            )}
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

export default Navbar;
