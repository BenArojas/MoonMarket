import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Avatar } from "@mui/material";
import { sendFriendRequest } from '@/api/friend';
import { useState } from "react";

function AddFriend({  username, email, token }) {
  const [resultMessage, setResultMessage] = useState("");

  const handleSubmit = async () => {
    try {
      await sendFriendRequest(username, token);
      setResultMessage("Friend request sent successfully");
    } catch (error) {
      setResultMessage(`Error adding friend: ${error.message}`);
    }
  };

  return (
    resultMessage ? 
      <p>{resultMessage}</p> : 
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
