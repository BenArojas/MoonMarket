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

export async function action({ request }) {
  let intent = formData.get("intent");
  if (intent === "username") {
    const newUsername = updateUsername(formData.get("username"));
    return newUsername;
  }
  if (intent === "password") {
    let oldPassword = formData.get("password");
    let newPassword = formData.get("new-password");
    const changedPassword = changePassword(oldPassword, newPassword);
    return changedPassword;
  }
  if (intent === "Deposit") {
    let money = formData.get("money");
    const deposit = addDeposit(money);
    return deposit;
  }
  if (intent === "accept") {
    const requestId = formData.get("requestId");
    const result = await answerFriendRequest(
      requestId.toString(),
      "accept",

    );
    return result;
  }
  if (intent === "reject") {
    const requestId = formData.get("requestId");
    const result = await answerFriendRequest(
      requestId.toString(),
      "reject",

    );
    return result;
  }
}

function FriendRequestCard({ request }) {
  return (
    <Stack
      key={request.from_user.id}
      direction={"row"}
      alignItems={"center"}
      spacing={8}
    // justifyContent={"space-around"}
    >
      <Avatar
        sx={{ width: 56, height: 56, mr: 2 }}
        alt="Remy Sharp"
        src={
          "https://plus.unsplash.com/premium_photo-1683121366070-5ceb7e007a97?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        }
      />
      <Stack direction={"column"} spacing={1}>
        <Typography variant="body2">{request.from_user.id}</Typography>
        <Stack spacing={2} direction={"row"}>
          <Box component={Form} method="post" sx={{ width: "50%" }}>
            <input
              type="hidden"
              readOnly
              name="requestId"
              value={request._id}
            />
            <input type="hidden" />
            <Button
              sx={{ width: "100%" }}
              variant="contained"
              name="intent"
              value="accept"
              type="submit"
            >
              Add
            </Button>
          </Box>
          <Box component={Form} method="post" sx={{ width: "50%" }}>
            <input
              type="hidden"
              readOnly
              name="requestId"
              value={request._id}
            />
            <input type="hidden" name="" />
            <Button
              sx={{ width: "100%" }}
              variant="text"
              name="intent"
              value="reject"
              type="submit"
            >
              Ignore
            </Button>
          </Box>
        </Stack>
      </Stack>
    </Stack>
  );
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
          <Form method="patch">
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
          <Form method="patch" ref={password}>
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
              <Button variant="contained" name="intent" value="password">
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
          <Form method="post" ref={money}>
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
