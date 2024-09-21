import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Stack, Divider } from "@mui/material";
import FriendRequestCard from "@/components/FriendRequestCard";

const FriendRequestsTabContent = ({ friendRequests, onAnswer, isLoading }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Friend Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 mt-5">
        {friendRequests.length ? (
          <Stack
            direction="column"
            spacing={3}
            divider={<Divider orientation="horizontal" flexItem />}
          >
            {friendRequests.map((request) => (
              <FriendRequestCard
                key={request.request_id}
                request={request}
                onAnswer={(action) => onAnswer(request.request_id, action)}
                isLoading={isLoading}
              />
            ))}
          </Stack>
        ) : (
          <p>No Friend requests</p>
        )}
      </CardContent>
    </Card>
  );
};

export default FriendRequestsTabContent;