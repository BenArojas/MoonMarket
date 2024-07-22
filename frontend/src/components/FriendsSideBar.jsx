import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import { useContext } from "react";

import { FirstLetter } from "@/pages/ProtectedRoute";
import { Divider } from "@mui/material";
import AvatarGroup from "@mui/material/AvatarGroup";

import SearchFriends from "@/components/SearchFriends";

function FriendsSideBar() {
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
      <Avatar>{firstLetter}</Avatar>
      {/* <AvatarGroup /> */}
    </Stack>
  );
}

export default FriendsSideBar;
