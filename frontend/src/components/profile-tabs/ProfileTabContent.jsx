import React from 'react';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from '@mui/material';

const ProfileTabContent = ({ username, onSubmit, isLoading }) => {
  const [newUsername, setNewUsername] = React.useState(username);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(newUsername);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Make changes to your profile here. Click save when you're done.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username" 
              value={newUsername} 
              onChange={(e) => setNewUsername(e.target.value)} 
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