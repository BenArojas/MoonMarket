import React from 'react';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from '@mui/material';

interface ProfileTabContentProps {
  handlePasswordSubmit: (oldPassword: string, newPassword: string) => void
  handleUsernameSubmit: (username: string) => void
  username: string
  isLoading: boolean
}
const ProfileTabContent = ({ handlePasswordSubmit, handleUsernameSubmit, username, isLoading }: ProfileTabContentProps) => {
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [newUsername, setNewUsername] = React.useState(username);


  const changePassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handlePasswordSubmit(currentPassword, newPassword);
  };
  const changeUsername = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleUsernameSubmit(newUsername);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Change profile related settings here.</CardDescription>
      </CardHeader>
      <form onSubmit={changeUsername}>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={newUsername}
              onChange={(e:React.ChangeEvent<HTMLInputElement>) => setNewUsername(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant="contained"
            type="submit"
            // disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save changes'}
          </Button>
        </CardFooter>
      </form>
      <form onSubmit={changePassword}>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="current">Current password</Label>
            <Input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e:React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new">New password</Label>
            <Input
              id="new"
              type="password"
              value={newPassword}
              onChange={(e:React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant="contained"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ProfileTabContent;