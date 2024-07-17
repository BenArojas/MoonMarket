import React, { useContext, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";

import { Divider } from "@mui/material";
import { FirstLetter } from "@/pages/ProtectedRoute";
import AvatarGroup from "@mui/material/AvatarGroup";

import SearchFriends from "@/components/SearchFriends";

function FriendsSideBar() {
  const { firstLetter } = useContext(FirstLetter);


  return (
    <Stack
      direction={"column"}
      spacing={2}
      alignItems="center"
      justifyContent={"flex-start"}
      sx={{
        marginTop: 25,
      }}
    >
     <SearchFriends/>
      <Divider flexItem />
      <Avatar>{firstLetter}</Avatar>
      <AvatarGroup> </AvatarGroup>
    </Stack>
    // <Stack
    //   direction={"column"}
    //   spacing={2}
    //   alignItems="center"
    //   justifyContent={"flex-start"}
    //   sx={{
    //     marginTop: 25,
    //   }}
    // >
    //  <SearchFriends/>
    //   <Divider flexItem />
    //   <Avatar>{firstLetter}</Avatar>
    //   <AvatarGroup> </AvatarGroup>
    // </Stack>
  );
}

export default FriendsSideBar;
