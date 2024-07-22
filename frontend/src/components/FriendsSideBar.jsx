import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import { useContext } from "react";
import { FirstLetter } from "@/pages/ProtectedRoute";
import { Divider } from "@mui/material";
import AvatarGroup from "@mui/material/AvatarGroup";

import SearchFriends from "@/components/SearchFriends";

function FriendsSideBar({ friends }) {
  const { firstLetter } = useContext(FirstLetter);

  return (
    <Stack
      direction={"column"}
      spacing={1}
      alignItems="center"
      justifyContent={"flex-start"}
    >
      <div>
        <SearchFriends />
        <Divider flexItem sx={{ m: 0 }} />
      </div>
      {/* <Avatar sx={{
        border:'2px solid black'
      }}>{firstLetter}</Avatar> */}
      <AvatarGroup max={4} sx={{
        flexDirection:'column',
      }}>
        {friends && friends.length > 0 ? (
          friends.map((friend) => (
            <Avatar key={friend.id}>
              {friend.username.charAt(0).toUpperCase()}
            </Avatar>
          ))
        ) : (
          <div>No friends yet</div>
        )}
      </AvatarGroup>
    </Stack>
  );
}

export default FriendsSideBar;
