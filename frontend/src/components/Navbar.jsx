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
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthProvider"; // Import the AuthProvider
import { useQueryClient } from "@tanstack/react-query"; // Import react-query for cache clearing

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function Navbar({ friendRequestsCount }) {
  const { toggleTheme, mode } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate(); // Use the navigate function from react-router
  const { logout } = useAuth(); // Get the logout function from AuthProvider
  const queryClient = useQueryClient(); // Get the query client to clear cache

  const isSpacePage = pathname === "/space";
  const mainNavItems = [
    { icon: Orbit, text: "space" },
    { icon: Globe, text: "global" },
    { icon: ArrowLeftRight, text: "transactions" },
    { icon: BriefcaseBusiness, text: "home" },
  ];

  // Define the logout process
  const handleLogout = async () => {
    try {
      queryClient.clear(); // Clear the query cache
      await logout(); // Execute the logout function
      navigate("/login", { replace: true }); // Redirect to login page
    } catch (error) {
      console.error("Error during logout", error);
      // Optionally, you can handle the error here, such as showing a notification
    }
  };

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
              color: pathname === `/${text}` ? "#077e5d" : "inherit",
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
              color={pathname === `/${text}` ? "#077e5d" : "currentColor"}
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
                  color: pathname === `/${text}` ? "#077e5d" : "inherit",
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
                        pathname === `/${text}` ? "#077e5d" : "currentColor"
                      }
                    />
                  </Badge>
                ) : (
                  <Icon
                    color={pathname === `/${text}` ? "#077e5d" : "currentColor"}
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
