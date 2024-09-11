import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Stack, Typography, Avatar } from "@mui/material";
import SearchFriends from "@/components/SearchFriends";
import { padding } from "polished";


const FriendsTabContent = ({ friendList }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Friends</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <SearchFriends />
        <Stack
          direction="column"
          spacing={3}
          sx={{
            overflowX: "auto",
            maxHeight: "250px",
            paddingX:'1rem',
            "&::-webkit-scrollbar-track": {
              "-webkit-box-shadow": "inset 0 0 6px rgba(0,0,0,0.3)",
              backgroundColor: "rgba(90,90,90,0.5)",
              borderRadius: "10px",
            },
            "&::-webkit-scrollbar": {
              width: "10px",
              backgroundColor: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#AAA",
              borderRadius: "10px",
              backgroundImage:
                "-webkit-linear-gradient(90deg, rgba(0, 0, 0, .2) 25%, transparent 25%, transparent 50%, rgba(0, 0, 0, .2) 50%, rgba(0, 0, 0, .2) 75%, transparent 75%, transparent)",
            },
          }}
        >
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
