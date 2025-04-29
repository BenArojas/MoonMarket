import { Divider, Tooltip } from "@mui/material";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface Friend{
  id: string;
  username: string;
  email:string;
}
interface FriendsSideBarProps{
  friends: Friend[]
  onAvatarClick: (id:string)=> void;
  activeSpaceship: string | undefined
}
function FriendsSideBar({ friends, onAvatarClick, activeSpaceship }: FriendsSideBarProps) {
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
      {friends.length > 0 ? (
        friends.map((friend) => (
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
                cursor: 'pointer',
                '&:hover': {
                  border: '2px solid white',
                  boxShadow: '0 0 10px 2px white',
                },
                ...(activeSpaceship === friend.id && {
                  border: '2px solid white',
                  boxShadow: '0 0 10px 2px white',
                }),
              }}
              onClick={() => onAvatarClick(friend.id)}
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