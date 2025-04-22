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

const FriendsTabContent = ({ friendList, handleSendFriendRequest }) => {
  const queryClient = useQueryClient();
  const removeFriendMutation = useMutation({
    mutationFn: removeFriend,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey:"authStatus"});
    },
  });
  const [open, setOpen] = React.useState(false);
  const [selectedFriend, setSelectedFriend] = React.useState(null);

  const handleClickOpen = (friendId) => {
    setSelectedFriend(friendId);
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setSelectedFriend(null);
  };
  const handleRemoveFriend = () => {
    if (selectedFriend) {
      removeFriendMutation.mutate(selectedFriend);
      handleClose();
    }
  };

  return (
    <Card sx={{ margin: { xs: "1rem", md: "2rem" } }}>
      <CardHeader>
        <Typography variant="h6">Friends</Typography>
      </CardHeader>
      <CardContent
        sx={{
          padding: { xs: "1rem", md: "1.5rem" },
          overflow: "hidden",
        }}
      >
        <Stack
          direction="column"
          spacing={2}
          sx={{
            overflowY: "auto",
            maxHeight: "250px",
            paddingX: "1rem",
            "&::-webkit-scrollbar": {
              width: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#AAA",
              borderRadius: "10px",
            },
          }}
        >
          <SearchFriends handleSendFriendRequest={handleSendFriendRequest}/>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Friend List:
          </Typography>
          {friendList.length > 0 ? (
            <Grid
              container
              direction="column"
              spacing={2}
              sx={{ width: "100%" }}
            >
              {friendList.map((friend) => (
                <Grid
                  container
                  item
                  key={friend.id}
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    paddingY: "0.5rem",
                  }}
                >
                  <Grid
                    item
                    xs={3}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Avatar />
                  </Grid>
                  <Grid
                    item
                    xs={4}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      overflow: "hidden",
                    }}
                  >
                    <Typography noWrap variant="body2">
                      {friend.username}
                    </Typography>
                  </Grid>
                  <Grid
                    item
                    xs={4}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      overflow: "hidden",
                    }}
                  >
                    <Typography noWrap variant="body2">
                      {friend.email}
                    </Typography>
                  </Grid>
                  <Grid
                    item
                    xs={1}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconButton onClick={() => handleClickOpen(friend.id)}>
                      <Trash2 />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography>No friends</Typography>
          )}
        </Stack>
      </CardContent>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{"Are you sure you want to remove this friend?"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You can't undo this action.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleRemoveFriend} autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default FriendsTabContent;