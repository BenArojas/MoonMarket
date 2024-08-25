import { Box, Divider, Typography} from "@mui/material";
import React, { useEffect } from "react";
import "@/styles/profile.css";
import { ProfileTabs } from "@/components/ProfileTabs";
import { Suspense } from "react";
import {
  useLoaderData,
  Await,
  defer,
  useOutletContext,
} from "react-router-dom";
import { getUserData } from "@/api/user";
import TabsSkeleton from "@/Skeletons/TabsSkeleton";
import { getFriendList } from "@/api/friend";
import ErrorPage from "./ErrorPage";

export const loader = async () => {
  const userPromise = getUserData();
  const friendListPromise = getFriendList();

  return defer({
    user: userPromise,
    friendList: friendListPromise,
  });
};

function Profile() {
  // todo: add private details card and money stuff card
  const data = useLoaderData();
  const friendRequests = useOutletContext();

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
          resolve={Promise.all([data.user, data.friendList])}
          errorElement={<ErrorPage/>}
        >
          {([user, friendList]) => (
            <>
              {user.length === 0 ? (
                <TabsSkeleton />
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    mt: 8
                  }}
                >
                  <ProfileTabs
                    username={user.username}
                    current_balance={user.current_balance}
                    friendRequests={friendRequests}
                    friendList={friendList}
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
