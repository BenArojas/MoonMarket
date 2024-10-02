import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Grid, Stack, Typography, Avatar, IconButton, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import SearchFriends from "@/components/SearchFriends";
import { Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeFriend } from '@/api/friend'

// const friendList = [
//   {
//     key: 1,
//     email:"friend@gmail.com",
//     username: "friend"
//   }, {
//     key: 2,
//     email:"friend@gmail.com",
//     username: "friend"
//   }, {
//     key: 3,
//     email:"friend@gmail.com",
//     username: "friend"
//   }, {
//     key: 4,
//     email:"friend@gmail.com",
//     username: "friend"
//   }, {
//     key: 5,
//     email:"friend@gmail.com",
//     username: "friend"
//   }, {
//     key: 6,
//     email:"friend@gmail.com",
//     username: "friend"
//   }, {
//     key: 7,
//     email:"friend@gmail.com",
//     username: "friend"
//   }
// ]

const FriendsTabContent = ({ friendList }) => {
  const queryClient = useQueryClient();
  const removeFriendMutation = useMutation({
    mutationFn: removeFriend,
    onSuccess: () => {
      queryClient.invalidateQueries('friendList')
    },
  });
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };
  const handleRemoveFriend = (friend_id) => {
    removeFriendMutation.mutate(friend_id);
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Friends</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <SearchFriends />
        <Stack
          direction="column"
          spacing={3}
          sx={{
            overflowY: "auto",
            overflowX: "clip",
            maxHeight: "250px",
            paddingX: "1rem",
            "&::-webkit-scrollbar-track": {
              "-webkit-box-shadow": "inset 0 0 6px rgba(0,0,0,0.3)",
              backgroundColor: "rgba(90,90,90,0.5)",
              borderRadius: "10px",
            },
            "&::-webkit-scrollbar": {
              width: "10px",
              backgroundColor: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#AAA",
              borderRadius: "10px",
              backgroundImage:
                "-webkit-linear-gradient(90deg, rgba(0, 0, 0, .2) 25%, transparent 25%, transparent 50%, rgba(0, 0, 0, .2) 50%, rgba(0, 0, 0, .2) 75%, transparent 75%, transparent)",
            },
          }}
        >
          <Typography variant="h6">Friend List:</Typography>
          {friendList.length > 0 ? <Grid container spacing={2}>
            {friendList.map((friend) => (
              <Grid
                item
                container
                key={friend.id}
                spacing={2}
                alignItems="center"
              >
                <Grid item xs={2}>
                  <Avatar />
                </Grid>
                <Grid item xs={3}>
                  <Typography>{friend.username}</Typography>
                </Grid>
                <Grid item xs={5}>
                  <Typography>{friend.email}</Typography>
                </Grid>
                <Grid item>
                  <IconButton onClick={handleClickOpen}>
                    <Trash2 />
                  </IconButton>
                  <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                  >
                    <DialogTitle id="alert-dialog-title">
                      {"Are you sure you want to remove this friend?"}
                    </DialogTitle>
                    <DialogContent>
                      <DialogContentText id="alert-dialog-description">
                        you can't undo this action
                      </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={handleClose}>Disagree</Button>
                      <Button onClick={() => handleRemoveFriend(friend.id)} autoFocus>
                        Agree
                      </Button>
                    </DialogActions>
                  </Dialog>
                </Grid>
              </Grid>
            ))}
          </Grid> : <p>No friends</p>}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default FriendsTabContent;
