import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Avatar } from "@mui/material";
function AddFriend({ src, username, email }) {
  return (
    <Stack direction={"row"} justifyContent={'space-between'} spacing={2} alignItems={"center"}>
        
      <Avatar
        alt="Remy Sharp"
        src={
          "https://plus.unsplash.com/premium_photo-1683121366070-5ceb7e007a97?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        }
      />
      <Stack spacing={1}>
        <Typography>{username}</Typography>
        <Typography>{email}</Typography>
      </Stack>
      <Button variant="contained">Add</Button>
    </Stack>
  );
}

export default AddFriend;
