import { answerFriendRequest, sendFriendRequest } from "@/api/friend";
import { addDeposit, changePassword, updateUsername, changeAccountTier } from "@/api/user";
import AccountTabContent from '@/components/profile-tabs/AccountTabContent';
import FriendRequestsTabContent from '@/components/profile-tabs/FriendRequestsTabContent';
import FriendsTabContent from '@/components/profile-tabs/FriendsTabContent';
import MoneyTabContent from '@/components/profile-tabs/MoneyTabContent';
import ProfileTabContent from '@/components/profile-tabs/ProfileTabContent';
import SubscriptionTabContent from '@/components/profile-tabs/SubscriptionTabContent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge, useMediaQuery, useTheme } from "@mui/material";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from "react";


const ProfileTabs = ({ username, current_balance, friendRequests, friendList, friendRequestsCount, sentFriendRequestsData, profit, deposits, yearly_expenses, current_tier, userId }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('xl'));
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('account');

  const updateUsernameMutation = useMutation({
    mutationFn: updateUsername,
    onSuccess: async () => {
      await queryClient.invalidateQueries('userName')
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword
  });

  const addDepositMutation = useMutation({
    mutationFn: addDeposit,
    onSuccess: async () => {
      await queryClient.invalidateQueries('userData');
    },
  });

  const changeSubscriptionTierMutation = useMutation({
    mutationFn: changeAccountTier,
    onSuccess: async () => {
      await queryClient.invalidateQueries('userData');
    },
  });

  const sendFriendMutation = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries('sentFriendRequests');
    },
  });

  const answerFriendRequestMutation = useMutation({
    mutationFn: answerFriendRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries('friendRequestsLength');
      await queryClient.invalidateQueries('friendList');
    },
  });

  const handleTierChange = (payload) => {
    console.log("userId", userId)
    changeSubscriptionTierMutation.mutate({ userId, payload });
  };

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
    <Tabs
      defaultValue="account"
      value={activeTab}
      onValueChange={setActiveTab}
      className={`${isMobileScreen ? 'w-[75%]' : isSmallScreen ? 'w-[90%]' : 'w-[750px]'} `}
    >
      {/* Tabs Header */}
      <TabsList
        className={`grid w-full ${isMobileScreen ? 'grid-cols-2 h-30' : 'grid-cols-6'}`}
        style={{
          backgroundColor: theme.palette.trinary.main,
          padding: '4px',
        }}
      >
        <TabsTrigger
          value="account"
          className={isMobileScreen ? 'text-xs p-2' : ''}
          style={{
            borderRight: '1px solid #ccc',
          }}
        >
          Account
        </TabsTrigger>
        <TabsTrigger
          value="profile"
          className={isMobileScreen ? 'text-xs p-2' : ''}
          style={{
            borderRight: '1px solid #ccc',
          }}
        >
          Settings
        </TabsTrigger>
        <TabsTrigger
          value="subscription"
          className={isMobileScreen ? 'text-xs p-2' : ''}
          style={{
            borderRight: '1px solid #ccc',
          }}
        >
          Subscription
        </TabsTrigger>
        <TabsTrigger
          value="money"
          className={isMobileScreen ? 'text-xs p-2' : ''}
          style={{
            borderRight: '1px solid #ccc',
          }}
        >
          Money
        </TabsTrigger>
        <TabsTrigger
          value="friends"
          className={isMobileScreen ? 'text-xs p-2' : ''}
          style={{
            borderRight: '1px solid #ccc',
          }}
        >
          Friends
        </TabsTrigger>
        <Badge badgeContent={friendRequestsCount} color="primary">
          <TabsTrigger
            value="friend_requests"
            className={isMobileScreen ? 'text-xs p-2' : ''}
          >
            Friend Requests
          </TabsTrigger>
        </Badge>
      </TabsList>

      {/* Tabs Content */}

      <TabsContent value="account">
        <AccountTabContent
          currentBalance={current_balance}
          profit={profit}
          deposits={deposits}
          yearly_expenses={yearly_expenses}
        />
      </TabsContent>

      <TabsContent value="profile">
        <ProfileTabContent
          username={username}
          handlePasswordSubmit={handlePasswordSubmit}
          handleUsernameSubmit={handleUsernameSubmit}
          isLoading={changePasswordMutation.isLoading || updateUsernameMutation.isLoading}
        />
      </TabsContent>
      <TabsContent value="subscription">
        <SubscriptionTabContent
          currentTier={current_tier}
          changeSubscriptionTier={handleTierChange}
          changeSubscriptionTierLoading={changeSubscriptionTierMutation.isLoading}
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