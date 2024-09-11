// import { Button } from "@/components/ui/button";
    import { Form } from "react-router-dom";
  import {
    Stack,
    Typography,
    Avatar,
    Box,
    Button,
  } from "@mui/material";
  
  

function FriendRequestCard({ request }) {
    return (
      <Stack
        key={request.from_user.id}
        direction={"row"}
        // alignItems={"center"}
        // justifyContent={"center"}
        spacing={8}
      >
        <Box sx={{display:'flex', width:'70%', justifyContent:'space-between'}}>
        <Avatar
          sx={{ width: 56, height: 56, mr: 2 }}
          alt="Remy Sharp"
          src={
            "https://plus.unsplash.com/premium_photo-1683121366070-5ceb7e007a97?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          }
        />
        <Stack direction={"column"} spacing={1}>
          <Typography variant="body2">{request.from_user.id}</Typography>
          <Stack spacing={2} direction={"row"}>
            <Box component={Form} method="post" sx={{ width: "50%" }}>
              <input
                type="hidden"
                readOnly
                name="requestId"
                value={request._id}
              />
              <input type="hidden" />
              <Button
                sx={{ width: "100%" }}
                variant="contained"
                name="intent"
                value="accept"
                type="submit"
              >
                Add
              </Button>
            </Box>
            <Box component={Form} method="post" sx={{ width: "50%" }}>
              <input
                type="hidden"
                readOnly
                name="requestId"
                value={request._id}
              />
              <input type="hidden" name="" />
              <Button
                sx={{ width: "100%" }}
                variant="text"
                name="intent"
                value="reject"
                type="submit"
              >
                Ignore
              </Button>
            </Box>
          </Stack>
        </Stack>
        </Box>
      </Stack>
    );
  }

export default FriendRequestCard