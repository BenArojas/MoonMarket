import { Divider } from "@mui/material";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";

import SearchFriends from "@/components/SearchFriends";

function FriendsSideBar({ friends }) {

  return (
    <Stack
      direction={"column"}
      spacing={1}
      alignItems="center"
      justifyContent={"flex-start"}
    >
      <div>
        {/* <SearchFriends /> */}
        <Divider flexItem sx={{ m: 0 }} />
      </div>
      {friends && friends.length > 0 ? (
          friends.map((friend) => (
            <Avatar key={friend.id} sx={{border:'2px solid white'}}>
              {friend.username.charAt(0).toUpperCase()}
            </Avatar>))): null}
    </Stack>
  );
}

export default FriendsSideBar;
