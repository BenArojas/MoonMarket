import React, { useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Avatar } from "@mui/material";
import { sendFriendRequest } from '@/api/friend';

function AddFriend({ username, email, setFriend, handleSendFriendRequest}) {

  const handleSubmit = async () => {
      await handleSendFriendRequest(username);
      setFriend({})
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
