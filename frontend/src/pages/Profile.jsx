import { Box, Divider, Typography, Container } from "@mui/material";
import React, { useEffect } from "react";
import "@/styles/profile.css";
import { TabsDemo } from "@/components/ProfileTabs";
import { Suspense } from "react";
import { useLoaderData, Await, defer, useOutletContext } from "react-router-dom";
import { getUserData, getFriendRequest } from "@/api/user";

import TabsSkeleton from "@/Skeletons/TabsSkeleton";

export const loader = (token) => async () => {
  const user = getUserData(token);
  
  // const user = response.data;
  return defer({ user });
}

function Profile() {
  // todo: add private details card and money stuff card
  const data = useLoaderData();
  const friendRequests = useOutletContext()

  return (
    <div>
      <div className="heading-text">
        <Typography
          variant="h4"
          color="primary"
          sx={{
            textAlign: "center",
            margin: "auto",
            cursor: "pointer",
            width: "200px",
            letterSpacing: "-3px",
          }}
          className="underline-effect"
        >
          ACCOUNT
        </Typography>
      </div>
      <Divider />
      <Suspense fallback={<TabsSkeleton />}>
        <Await
          resolve={data.user}
          errorElement={<p>Error loading package location!</p>}
        >
          {(res) => (
            <>
              {res.length === 0 ? (
                <TabsSkeleton />
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    margin: "auto",
                    minHeight: "50vh", // Adjust as needed to center vertically within the view
                  }}
                >
                  <TabsDemo
                    username={res.username}
                    current_balance={res.current_balance}
                    friendRequests={friendRequests}
                  />
                </Box>
              )}
            </>
          )}
        </Await>
      </Suspense>
    </div>
  );
}

export default Profile;
