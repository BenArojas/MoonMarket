import AddFriend from "@/components/AddFriend";
import AddIcon from "@mui/icons-material/Add";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Input from "@mui/material/Input";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import React from "react";
import Test from "/RealMoon.png";

function SearchFriends() {
  const friends = [
    { username: "Hilik", email: "benarojas11@mgai.com" },
    { username: "Huriel", email: "huriel223@mgai.com" },
  ];
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;
  return (
    <>
      <IconButton onClick={handleClick}>
        <Avatar>
          <AddIcon />
        </Avatar>
      </IconButton>
      <Popover
        PaperProps={{
          sx: { p: 3 },
        }}
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "center",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <Typography sx={{ textAlign: "center" }}>
          Search for friends to add.
        </Typography>
        <Stack
          direction={"row"}
          spacing={2}
          py={2}
        >
          <Input sx={{ flexGrow: 1 }} placeholder="Name" />
          <Button variant="outlined">Search</Button>
        </Stack>
        <Stack spacing={2}>
          {friends.map((friend) => (
            <AddFriend src={Test} {...friend} />
          ))}
        </Stack>
      </Popover>
    </>
  );
}

export default SearchFriends;
