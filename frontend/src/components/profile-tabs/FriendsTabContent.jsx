import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Stack, Typography, Avatar } from "@mui/material";
import SearchFriends from "@/components/SearchFriends";

const FriendsTabContent = ({ friendList }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Friends</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <SearchFriends />
        <Stack direction="column" spacing={3}>
          <Typography variant="h6">Friend List:</Typography>
          {friendList.map((friend) => (
            <Stack
              key={friend.id}
              direction="row"
              justifyContent="space-between"
              spacing={2}
              alignItems="center"
            >
              <Avatar />
              <Typography>{friend.username}</Typography>
              <Typography>{friend.email}</Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default FriendsTabContent;