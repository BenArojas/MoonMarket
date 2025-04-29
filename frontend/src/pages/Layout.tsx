import { getFriendRequestLength } from "@/api/friend";
import AddApiKey from "@/components/AddApiKey";
import Greetings from "@/components/Greetings";
import Sidebar from "@/components/Sidebar";
import { useUser } from '@/contexts/UserContext';
import "@/styles/global.css";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { createContext, useState } from "react";
import { Outlet } from "react-router-dom";

interface PercentageChangeContextType {
  percentageChange: number;
  setPercentageChange: (value: number) => void;
}

export const PercentageChange = createContext<PercentageChangeContextType>({
  percentageChange: 0,
  setPercentageChange: () => {},
});

const Layout: React.FC = () => {
    const [percentageChange, setPercentageChange] = useState<number>(0);

    const theme = useTheme();
    const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const user = useUser();
    const username = user?.username || 'Guest';
    const isEnabled = user?.enabled || 'false';

    const [showModal, setShowModal] = useState<boolean>(!isEnabled);
    const { data: friendRequestsLength } = useQuery({
        queryKey: ['friendRequestsLength'],
        queryFn: getFriendRequestLength
    });


    return (
        <>
            <PercentageChange.Provider
                value={{
                    percentageChange,
                    setPercentageChange,
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                    }}
                >
                    {isMobileScreen ? null : <Sidebar />}
                    <Box
                        className="layout"
                        sx={{
                            flexGrow: 1,
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        <Greetings username={username} friendRequestsCount={friendRequestsLength} />
                        {isEnabled ? (
                            <Outlet context={friendRequestsLength} />
                        ) : (
                            <AddApiKey
                                isOpen={showModal}
                                onClose={() => setShowModal(false)}
                            />
                        )}
                    </Box>
                </Box>
            </PercentageChange.Provider>
        </>
    );
};

export default Layout;