import { useQuery } from "@tanstack/react-query";
import { Box, Divider, Typography, useTheme, useMediaQuery } from "@mui/material";
import "@/styles/profile.css";
import TabsSkeleton from "@/Skeletons/TabsSkeleton";
import ErrorPage from "./ErrorPage";
import { getUserData} from "@/api/user";
import {getFriendList, getFriendRequestUsers, getSentFriendRequest} from '@/api/friend'
import { MemoizedProfileTabs } from '@/components/ProfileTabs'
import { useOutletContext } from "react-router-dom";
import { useUser} from '@/contexts/UserContext';



const Profile = () => {
  const userData = useUser();

  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const friendRequestsCount = useOutletContext();

  const { data: friendListData, isLoading: friendListLoading, error: friendListError } = useQuery({
    queryKey: ['friendList'],
    queryFn: getFriendList
  });
  const { data: friendRequestsData, isLoading: friendRequestsLoading, error: friendRequestsError } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: getFriendRequestUsers
  });

  const { data: sentFriendRequestsData, isLoading: sentFriendRequestsLoading, error: sentFriendRequestsError } = useQuery({
    queryKey: ['sentFriendRequests'],
    queryFn: getSentFriendRequest
  });


  if (friendListLoading || friendRequestsLoading || sentFriendRequestsLoading) {
    return <TabsSkeleton />;
  }

  if ( friendListError || friendRequestsError || sentFriendRequestsError) {
    return <ErrorPage />;
  }

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
          mt: isMobileScreen? 2: 8 , 
          mb:  isMobileScreen? 2: 0
        }}
      >
        <MemoizedProfileTabs
          username={userData.username}
          current_balance={userData.current_balance}
          profit = {userData.profit}
          deposits = {userData.deposits}
          yearly_expenses = {userData.yearly_expenses}
          friendRequests={friendRequestsData || []}
          sentFriendRequestsData={sentFriendRequestsData || []}
          friendList={friendListData || []}
          friendRequestsCount={friendRequestsCount}
        />
      </Box>
    </div>
  );
};

export default Profile;
