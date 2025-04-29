import { searchUser } from '@/api/user';
import AddFriend from "@/components/AddFriend";
import { Box, Button } from "@mui/material";
import Input from "@mui/material/Input";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useMutation } from '@tanstack/react-query';
import { Friend } from './profile-tabs/FriendsTabContent';

interface SearchFriendsProps {
  handleSendFriendRequest:  (username: string) => Promise<void>; 
}
function SearchFriends({ handleSendFriendRequest }: SearchFriendsProps) {

  const [friend, setFriend] = useState<Friend| undefined>(undefined)
  const [searchInput, setSearchInput] = useState("");

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
          {friend && <AddFriend username={friend.username} email={friend.email} setFriend={setFriend} handleSendFriendRequest={handleSendFriendRequest} />}
        </Stack>
      </Box>
    </>
  );
}

export default SearchFriends;
