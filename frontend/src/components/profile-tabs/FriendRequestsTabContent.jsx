import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Stack, Divider } from "@mui/material";
import FriendRequestCard from "@/components/FriendRequestCard";

const FriendRequestsTabContent = ({ friendRequests, sentFriendRequests, onAnswer, isLoading }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Friend Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 mt-5">
        <div>
          <h3 className="text-lg font-semibold mb-2">Received Requests</h3>
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
            <p>No received friend requests</p>
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Sent Requests</h3>
          {sentFriendRequests.length ? (
            <Stack
              direction="column"
              spacing={3}
              divider={<Divider orientation="horizontal" flexItem />}
            >
              {sentFriendRequests.map((request) => (
                <FriendRequestCard
                  key={request.request_id}
                  request={request}
                  isSentRequest={true}
                  isLoading={isLoading}
                />
              ))}
            </Stack>
          ) : (
            <p>No sent friend requests</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FriendRequestsTabContent;