import AddFriend from "@/components/AddFriend";
import AddIcon from "@mui/icons-material/Add";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Input from "@mui/material/Input";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import React, { useState } from "react";
import Test from "/RealMoon.png";
import { searchUser } from '@/api/user'
import { useAuth } from "@/contexts/AuthProvider";

function SearchFriends() {
  const { token } = useAuth();
  const [friend,setFriend] = useState({})
  const [error,setError] = useState()

  const [anchorEl, setAnchorEl] = React.useState(null);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
    setFriend({})
    setSearchInput(null);
  };


  const [searchInput, setSearchInput] = useState("");
  const handleInputChange = (event) => {
    setSearchInput(event.target.value);
    setError(null)
  };

  const handleSearchClick = async () => {
    if (searchInput.trim()) {
      try {
        const result = await searchUser(searchInput, token);
        setFriend(result)
      } catch (error) {
        console.error("Error searching for user:", error);
       setError(error.response.data.detail)
      }
    }
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
          <Input sx={{ flexGrow: 1 }} placeholder="Name" value={searchInput}
            onChange={handleInputChange} />
          <Button variant="outlined" onClick={handleSearchClick}>Search</Button>
        </Stack>
        <Stack spacing={2}>
          {error? <p>{error}</p>: friend.username && <AddFriend src={Test} username={friend.username} email={friend.email} token={token}/>}
        </Stack>
      </Popover>
    </>
  );
}

export default SearchFriends;
