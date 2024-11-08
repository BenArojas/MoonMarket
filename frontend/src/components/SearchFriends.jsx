import { searchUser } from '@/api/user';
import AddFriend from "@/components/AddFriend";
import { useAuth } from "@/contexts/AuthProvider";
import { Box, Button } from "@mui/material";
import Input from "@mui/material/Input";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useMutation, useQueryClient } from '@tanstack/react-query';

function SearchFriends({handleSendFriendRequest}) {

  const [friend, setFriend] = useState({})
  const [searchInput, setSearchInput] = useState("");

  const handleInputChange = (event) => {
    setSearchInput(event.target.value);
  };
  const searchUserMutation = useMutation({
    mutationFn: searchUser,
    onSuccess: (result) => {
      setFriend(result)
    },
  });

  const handleSearchUser = () => {
    if (searchInput.trim()) {
      searchUserMutation.mutate(searchInput);
    }
  };

  return (
    <>
      <Box
      >
        <Typography sx={{ textAlign: "center" }}>
          Search for friends to add.
        </Typography>
        <Stack
          direction={"row"}
          spacing={2}
          py={2}
        >
          <Input sx={{ flexGrow: 1 }} placeholder="Name" value={searchInput}
            onChange={handleInputChange} />
          <Button variant="outlined" onClick={handleSearchUser}>Search</Button>
        </Stack>
        <Stack spacing={2}>
          {friend.username && <AddFriend username={friend.username} email={friend.email} setFriend={setFriend} handleSendFriendRequest={handleSendFriendRequest}/>}
        </Stack>
      </Box>
    </>
  );
}

export default SearchFriends;
