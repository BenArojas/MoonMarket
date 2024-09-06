// import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useRef } from "react";
import { Form, useNavigation } from "react-router-dom";
import { updateUsername, changePassword, addDeposit } from "@/api/user";
import {
  Stack,
  Typography,
  Avatar,
  Divider,
  Badge,
  Box,
  Button,
} from "@mui/material";

import { answerFriendRequest } from "@/api/friend";
import SearchFriends from "@/components/SearchFriends";
import { useTheme } from '@mui/material/styles';
import FriendRequestCard from "@/components/FriendRequestCard";

export async function action({ request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  try {
    switch (intent) {
      case "username":
        const newUsername = await updateUsername(formData.get("username"));
        return newUsername;

      case "password":
        const oldPassword = formData.get("password");
        const newPassword = formData.get("new-password");
        const changedPassword = await changePassword(oldPassword, newPassword);
        return changedPassword;

      case "Deposit":
        const money = formData.get("money");
        const deposit = await addDeposit(money);
        return deposit;

      case "accept":
      case "reject":
        const requestId = formData.get("requestId");
        const result = await answerFriendRequest(requestId.toString(), intent);
        return result;

      default:
        throw new Error("Unknown intent");
    }}
    catch (error) {
      // Return an object indicating failure, but don't throw
      return { ok: false, error: error.message };
    }
  
}

export function ProfileTabs({
  username,
  current_balance,
  friendRequests,
  friendList,
}) {
  const theme = useTheme();
  const password = useRef(null);
  const money = useRef(null);

  const navigation = useNavigation();
  const { state } = navigation;

  useEffect(() => {
    if (state === "idle" && password.current) {
      password.current.reset();
    }
    if (state === "idle" && money.current) {
      money.current.reset();
    }
  }, [state, password, money]);

  return (
    <Tabs defaultValue="profile" className="w-[650px]">
      <TabsList className="grid w-full grid-cols-5" style={{ backgroundColor: theme.palette.trinary.main }}>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="password">Settings</TabsTrigger>
        <TabsTrigger value="money">Money</TabsTrigger>
        <TabsTrigger value="friends">Friends</TabsTrigger>
        <Badge badgeContent={friendRequests.length} color="primary">
          <TabsTrigger value="Friend_requests">Friend Requests</TabsTrigger>
        </Badge>
      </TabsList>
      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Make changes to your profile here. Click save when you're done.
            </CardDescription>
          </CardHeader>
          <Form method="patch" action="/profile">
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" defaultValue={username} />
                <input type="hidden" name="" />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="contained"
                type="submit"
                name="intent"
                value="username"
              >
                Save changes
              </Button>
            </CardFooter>
          </Form>
        </Card>
      </TabsContent>
      <TabsContent value="password">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password here.</CardDescription>
          </CardHeader>
          <Form method="patch" ref={password} action="/profile"> 
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="current">Current password</Label>
                <Input id="current" type="password" name="password" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new">New password</Label>
                <Input id="new" type="password" name="new-password" />
                <input type="hidden" name="" />
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="contained" name="intent" value="password" type="submit">
                Save changes
              </Button>
            </CardFooter>
          </Form>
        </Card>
      </TabsContent>
      <TabsContent value="money">
        <Card>
          <CardHeader>
            <CardTitle>Money</CardTitle>
            <CardDescription>
              you currently have {current_balance.toLocaleString("en-US")}$ in
              your account. if you wish to add more, you can deposit more below.
            </CardDescription>
          </CardHeader>
          <Form method="post" ref={money} action="/profile">
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="new">$$$</Label>
                <Input id="new" type="number" name="money" />
                <input type="hidden" name="" />
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="contained" name="intent" value="Deposit" type="submit">
                Add
              </Button>
            </CardFooter>
          </Form>
        </Card>
      </TabsContent>
      <TabsContent value="friends">
        <Card>
          <CardHeader>
            <CardTitle>Friends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <SearchFriends />
            <Stack direction="column" spacing={3}>
              <Typography variant="h6">Friend List:</Typography>
              {friendList.map((friend) => {
                return (
                  <Stack
                    key={friend.id}
                    direction="row"
                    justifyContent="space-between"
                    spacing={2}
                    alignItems="center"
                  >
                    <Avatar

                    />
                    <Typography>{friend.username}</Typography>
                    <Typography>{friend.email}</Typography>
                  </Stack>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="Friend_requests">
        <Card>
          <CardHeader>
            <CardTitle>Friend Requests</CardTitle>
            {/* <CardDescription>Friend requests to handle</CardDescription> */}
          </CardHeader>
          <CardContent className="space-y-2 mt-5">
            {friendRequests.length ? (
              <Stack
                direction={"column"}
                spacing={3}
                divider={<Divider orientation="horizontal" flexItem />}
              >
                {friendRequests.map((request) => (
                  <FriendRequestCard request={request} />
                ))}
              </Stack>
            ) : (
              <p>No Friend requests</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
