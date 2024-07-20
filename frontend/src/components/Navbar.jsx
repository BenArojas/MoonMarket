import { Box, Stack, Badge, Popover, Button, Typography, Avatar, Divider } from "@mui/material";
import { useState } from "react";
import { ArrowLeftRight, BriefcaseBusiness, Orbit, User, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { answerFriendRequest } from '@/api/user'
import { useAuth } from "@/contexts/AuthProvider";

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function Navbar({ friendRequests }) {
  const { token } = useAuth();
  console.log(friendRequests);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);


  const { pathname } = useLocation();
  const navItems = [
    { icon: Orbit, text: "space" },
    { icon: BriefcaseBusiness, text: "portfolio" },
    { icon: ArrowLeftRight, text: "transactions" },
    {
      icon: User,
      text: "profile",
      badge: friendRequests.length,
      onClick: friendRequests.length ? handleClick : null
    },
    { icon: LogOut, text: "logout" },
  ];

  const handleAcceptClick = async (requestId) => {
    try {
      const result = await answerFriendRequest(requestId, 'accept', token);
      console.log(result);
      // Handle successful acceptance (e.g., update UI, remove request from list)
    } catch (error) {
      console.error(error);
      // Handle error (e.g., show error message to user)
    }
  }

  const handleRejectClick = async (requestId) => {
    try {
      const result = await answerFriendRequest(requestId, 'reject', token);
      console.log(result);
      // Handle successful rejection (e.g., update UI, remove request from list)
    } catch (error) {
      console.error(error);
      // Handle error (e.g., show error message to user)
    }
  }

  return (
    <Stack flexDirection={"row"} gap={5}>
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
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Stack spacing={3} sx={{ p: 2, width: 300, maxHeight: 350 }}>
          <Typography variant="h6" gutterBottom>Friend Requests</Typography>

          {friendRequests.map((request, index) => (
            <Stack direction={"row"} alignItems={"center"} justifyContent={"space-around"}>
              <Avatar
                alt="Remy Sharp"
                src={
                  "https://plus.unsplash.com/premium_photo-1683121366070-5ceb7e007a97?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                }
              />
              <Stack direction={"column"} spacing={1} >
                <Typography variant="body2" key={index}>{request.from_user.id}</Typography>
                <Stack spacing={2} direction={"row"} justifyContent={"space-evenly"}>
                <Button variant="contained" onClick={() => handleAcceptClick(request._id)}>Add</Button>
                <Button variant="outlined" onClick={() => handleRejectClick(request._id)}>Ignore</Button>
                </Stack>
              </Stack>

            </Stack>
          ))}
          <Divider />
          <Button
            component={Link}
            to="/profile"
            variant="contained"
            onClick={handleClose}
            sx={{ mt: 2 }}
          >

            Go to Profile
          </Button>
        </Stack>
      </Popover>
    </Stack>
  );
}

export default Navbar;
