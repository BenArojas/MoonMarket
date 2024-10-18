import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateUsername, changePassword, addDeposit } from "@/api/user";
import { answerFriendRequest, sendFriendRequest } from "@/api/friend";
import { useTheme } from '@mui/material/styles';
import ProfileTabContent from '@/components/profile-tabs/ProfileTabContent'
import PasswordTabContent from '@/components/profile-tabs/PasswordTabContent'
import MoneyTabContent from '@/components/profile-tabs/MoneyTabContent'
import FriendsTabContent from '@/components/profile-tabs/FriendsTabContent'
import FriendRequestsTabContent from '@/components/profile-tabs/FriendRequestsTabContent'
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from "@mui/material";


const ProfileTabs = ({ username, current_balance, friendRequests, friendList, friendRequestsCount, sentFriendRequestsData }) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');

  const updateUsernameMutation = useMutation({
    mutationFn: updateUsername,
    onSuccess: () => {
      queryClient.invalidateQueries('userName')
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword
  });

  const addDepositMutation = useMutation({
    mutationFn: addDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries('userData');
    },
  });
  const sendFriendMutation = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries('sentFriendRequests');
    },
  });

  const answerFriendRequestMutation = useMutation({
    mutationFn: answerFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries('friendRequestsLength');
      queryClient.invalidateQueries('friendList');
    },
  });

  const handleSendFriendRequest = (username) => {
    sendFriendMutation.mutate(username);
  };

  const handleUsernameSubmit = (newUsername) => {
    updateUsernameMutation.mutate(newUsername);
  };

  const handlePasswordSubmit = (oldPassword, newPassword) => {
    changePasswordMutation.mutate({ oldPassword, newPassword });
  };

  const handleDepositSubmit = (amount) => {
    addDepositMutation.mutate(amount);
  };

  const handleFriendRequestAnswer = (request_Id, answer) => {
    answerFriendRequestMutation.mutate({ request_Id, answer });
  };

  return (
    <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-[650px]">
      <TabsList className="grid w-full grid-cols-5" style={{ backgroundColor: theme.palette.trinary.main }}>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="password">Settings</TabsTrigger>
        <TabsTrigger value="money">Money</TabsTrigger>
        <TabsTrigger value="friends">Friends</TabsTrigger>
        <Badge badgeContent={friendRequestsCount} color="primary">
          <TabsTrigger value="friend_requests">Friend Requests</TabsTrigger>
        </Badge>
      </TabsList>

      <TabsContent value="profile">
        <ProfileTabContent
          username={username}
          onSubmit={handleUsernameSubmit}
          isLoading={updateUsernameMutation.isLoading}
        />
      </TabsContent>

      <TabsContent value="password">
        <PasswordTabContent
          onSubmit={handlePasswordSubmit}
          isLoading={changePasswordMutation.isLoading}
        />
      </TabsContent>

      <TabsContent value="money">
        <MoneyTabContent
          currentBalance={current_balance}
          onSubmit={handleDepositSubmit}
          isLoading={addDepositMutation.isLoading}
        />
      </TabsContent>

      <TabsContent value="friends">
        <FriendsTabContent friendList={friendList} handleSendFriendRequest={handleSendFriendRequest} />
      </TabsContent>

      <TabsContent value="friend_requests">
        <FriendRequestsTabContent
          friendRequests={friendRequests}
          sentFriendRequests={sentFriendRequestsData}
          onAnswer={handleFriendRequestAnswer}
          isLoading={answerFriendRequestMutation.isLoading}
        />
      </TabsContent>
    </Tabs>
  );
};

export const MemoizedProfileTabs = React.memo(ProfileTabs);