import { Box, Stack } from "@mui/material";
import { ArrowLeftRight, BriefcaseBusiness, Orbit, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function Navbar() {
  const { pathname } = useLocation();
  const navItems = [
    { icon: Orbit, text: "space" },
    { icon: BriefcaseBusiness, text: "portfolio" },
    { icon: ArrowLeftRight, text: "transactions" },
    { icon: User, text: "profile" },
  ];

  return (
    <Stack flexDirection={"row"} gap={5}>
      {navItems.map(({ icon: Icon, text }) => (
          <Box component={Link}
            to={text}
            key={text}
            sx={{
              color: pathname === `/${text}` ? "#077e5d" : "inherit",
              display: "flex",
              flexDirection: "row",
              gap: 1,
              cursor: "pointer",
            }}
          >
            <Icon
              color={pathname === `/${text}` ? "#077e5d" : "currentColor"}
            />
            {capitalizeFirstLetter(text)}
          </Box>
      ))}
    </Stack>
  );
}

export default Navbar;
