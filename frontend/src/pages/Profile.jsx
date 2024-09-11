import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Box, Divider, Typography } from "@mui/material";
import "@/styles/profile.css";
import TabsSkeleton from "@/Skeletons/TabsSkeleton";
import ErrorPage from "./ErrorPage";
import { getUserData} from "@/api/user";
import {getFriendList, getFriendRequest} from '@/api/friend'
import { MemoizedProfileTabs } from '@/components/ProfileTabs'


const Profile = () => {

  const { data: userData, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['userData'],
    queryFn: getUserData
  });
  const { data: friendListData, isLoading: friendListLoading, error: friendListError } = useQuery({
    queryKey: ['friendList'],
    queryFn: getFriendList
  });
  const { data: friendRequestsData, isLoading: friendRequestsLoading, error: friendRequestsError } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: getFriendRequest
  });

  if (userLoading || friendListLoading || friendRequestsLoading) {
    return <TabsSkeleton />;
  }

  if (userError || friendListError || friendRequestsError) {
    return <ErrorPage />;
  }

  console.log(friendRequestsData)
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mt: 8
        }}
      >
        <MemoizedProfileTabs
          username={userData.username}
          current_balance={userData.current_balance}
          friendRequests={friendRequestsData || []}
          friendList={friendListData || []}
        />
      </Box>
    </div>
  );
};

export default Profile;
