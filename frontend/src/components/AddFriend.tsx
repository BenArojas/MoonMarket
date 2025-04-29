import React from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Avatar } from "@mui/material";
import { Friend } from "./profile-tabs/FriendsTabContent";

interface AddFriendProps {
  username: string;
  email: string;
  setFriend: React.Dispatch<React.SetStateAction<Friend | undefined>>;
  handleSendFriendRequest: (username: string) => Promise<void>; 
}

function AddFriend({ username, email, setFriend, handleSendFriendRequest }: AddFriendProps) {

  const handleSubmit = async () => {
    await handleSendFriendRequest(username);
    setFriend(undefined)
  }

  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="center">
      <Avatar
      />
      <Stack spacing={1}>
        <Typography>{username}</Typography>
        <Typography>{email}</Typography>
      </Stack>
      <Button variant="contained" onClick={handleSubmit}>Add</Button>
    </Stack>
  );
}

export default AddFriend;
