import React from 'react';
import { Stack, Typography, Avatar, Button } from "@mui/material";

function FriendRequestCard({ request, onAnswer, isLoading }) {
  const handleAccept = () => {
    onAnswer('accept');
  };

  const handleReject = () => {
    onAnswer('reject');
  };

  return (
    <Stack
      key={request.request_id}
      direction="row"
      spacing={2}
      alignItems="center"
      justifyContent="space-between"
    >
      <Stack direction="row" alignItems="center">
        <Avatar
          sx={{ width: 56, height: 56, mr: 2 }}
          alt={request.username}
          src={
            "https://plus.unsplash.com/premium_photo-1683121366070-5ceb7e007a97?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          }
        />
        <Stack direction="column" spacing={1}>
          <Typography variant="body2">{request.username}</Typography>
          <Typography variant="body2">{request.email}</Typography>
        </Stack>
      </Stack>
      <Stack direction="row" spacing={1}>
        <Button 
          variant="contained" 
          onClick={handleAccept}
          disabled={isLoading}
        >
          Accept
        </Button>
        <Button 
          variant="outlined" 
          onClick={handleReject}
          disabled={isLoading}
        >
          Reject
        </Button>
      </Stack>
    </Stack>
  );
}

export default FriendRequestCard;