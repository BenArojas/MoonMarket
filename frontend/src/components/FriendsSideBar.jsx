import { Divider, Tooltip } from "@mui/material";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

function FriendsSideBar({ friends, onAvatarClick, activeSpaceship }) {
  return (
    <Stack
      direction={"column"}
      spacing={1}
      alignItems="center"
      justifyContent={"flex-start"}
    >
      <div>
        <Divider flexItem sx={{ m: 0 }} />
      </div>
      {friends && friends.length > 0 ? (
        friends.map((friend, index) => (
          <Tooltip
            key={friend.id}
            title={
              <>
                <Typography variant="subtitle2" component="div" fontWeight="bold">
                  {friend.username}
                </Typography>
                <Typography variant="body2" component="div">
                  {friend.email}
                </Typography>
              </>
            }
            arrow
            placement="right"
          >
            <Avatar 
              sx={{
                border: activeSpaceship === index ? '2px solid yellow' : '2px solid white',
                cursor: 'pointer'
              }}
              onClick={() => onAvatarClick(index)}
            >
              {friend.username.charAt(0).toUpperCase()}
            </Avatar>
          </Tooltip>
        ))
      ) : null}
    </Stack>
  );
}

export default FriendsSideBar;