import { Box, Divider, Typography, useMediaQuery, useTheme } from '@mui/material'
import MarketStatus from "@/components/MarketStatus";
import Navbar from '@/components/Navbar';

interface GreetingsProps {
    username: string;
    friendRequestsCount: number
}

function Greetings({ username, friendRequestsCount }: GreetingsProps) {

    const theme = useTheme();
    const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const formattedDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    return (
        <Box sx={{
            width: '90%',
            marginRight: 'auto',
            marginLeft: 'auto',
            paddingBottom: '5px'
        }}>
            <Box sx={{
                display: isMobileScreen ? 'flex' : 'grid',
                gridTemplateColumns: 'auto auto',
                flexDirection: isMobileScreen ? 'column' : 'row',
                gap: 1,
                paddingBottom: isMobileScreen ? 2 : 0
            }}>
                <Box
                    className="Greetings"
                    sx={{
                        flex: 1,
                        width: '100%',
                        padding: 2,
                        order: isMobileScreen ? -1 : 0,
                        maxWidth: isMobileScreen ? '100%' : 'auto' // Ensure full width on mobile
                    }}
                >
                    <Typography variant="h4">Hello, {username}</Typography>
                    <Typography color={"#BDBDBD"} variant='subtitle1'>{formattedDate}</Typography>
                    <MarketStatus />
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center', // Ensure navbar is centered
                        width: '100%'
                    }}
                >
                    <Navbar friendRequestsCount={friendRequestsCount} />
                </Box>
            </Box>
            <Divider />
        </Box>
    )
}

export default Greetings