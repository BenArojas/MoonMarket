import { Button } from "@/components/ui/button";
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

export async function action({ request }, token) {
  let formData = await request.formData();
  let intent = formData.get("intent");
  if (intent === "username") {
    const newUsername = updateUsername(formData.get("username"), token);
    return newUsername;
  }
  if (intent === "password") {
    let oldPassword = formData.get("password");
    let newPassword = formData.get("new-password");
    const changedPassword = changePassword(oldPassword, newPassword, token);
    return changedPassword;
  }
  if (intent === "Deposit") {
    let money = formData.get("money");
    const deposit  = addDeposit(money, token);
    return deposit;
  }
}

export function TabsDemo({ username, current_balance }) {
  const password = useRef(null);
  const money = useRef(null);
  const navigation = useNavigation();
  const { state } = navigation;

  useEffect(() => {
    if (state === "idle" && password.current) {
      password.current.reset();
    }
    if(state === "idle" && money.current){
      money.current.reset();
    }
  }, [state, password, money])


  return (
    <Tabs defaultValue="profile" className="w-[500px]">
      <TabsList className="grid w-full grid-cols-3 bg-zinc-700">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="password">Settings</TabsTrigger>
        <TabsTrigger value="money">Money</TabsTrigger>
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
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="blackText"
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
            <CardDescription>
              Change your password here.
            </CardDescription>
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
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="blackText" name="intent" value="password">
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
              you currently have {current_balance.toLocaleString("en-US")}$ in your account. if you wish to add more, you can deposit more below.
            </CardDescription>
          </CardHeader>
          <Form method="post" ref={money}>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="new">$$$</Label>
                <Input id="new" type="number" name="money" />
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="blackText" name="intent" value="Deposit">
                Add
              </Button>
            </CardFooter>
          </Form>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
