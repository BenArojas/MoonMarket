import React from 'react';
import { Stack, Typography, Avatar, Button } from "@mui/material";

function FriendRequestCard({ request, onAnswer, isLoading, isSentRequest }) {
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
        />
        <Stack direction="column" spacing={1}>
          <Typography variant="body2">{request.username}</Typography>
          <Typography variant="body2">{request.email}</Typography>
        </Stack>
      </Stack>
      {isSentRequest && <Typography color="primary.light"> pending...</Typography>}
      {!isSentRequest && <Stack direction="row" spacing={1}>
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
      </Stack>}

    </Stack>
  );
}

export default FriendRequestCard;