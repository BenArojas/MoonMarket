import { searchUser } from '@/api/user';
import AddFriend from "@/components/AddFriend";
import { useAuth } from "@/contexts/AuthProvider";
import { Box, Button } from "@mui/material";
import Input from "@mui/material/Input";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import Test from "/RealMoon.png";

function SearchFriends() {
  const { token } = useAuth();
  const [friend,setFriend] = useState({})
  const [error,setError] = useState()
  const [searchInput, setSearchInput] = useState("");
  const handleInputChange = (event) => {
    setSearchInput(event.target.value);
    setError(null)
  };

  const handleSearchClick = async () => {
    if (searchInput.trim()) {
      try {
        const result = await searchUser(searchInput, token);
        setFriend(result)
      } catch (error) {
        console.error("Error searching for user:", error);
       setError(error.response.data.detail)
      }
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
          <Button variant="outlined" onClick={handleSearchClick}>Search</Button>
        </Stack>
        <Stack spacing={2}>
          {error? <p>{error}</p>: friend.username && <AddFriend src={Test} username={friend.username} email={friend.email} token={token}/>}
        </Stack>
      </Box>
    </>
  );
}

export default SearchFriends;
