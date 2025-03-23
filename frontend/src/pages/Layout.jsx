import { getFriendRequestLength } from "@/api/friend";
import { addApiKey } from "@/api/user";
import AddApiKey from "@/components/AddApiKey";
import Greetings from "@/components/Greetings";
import Sidebar from "@/components/Sidebar";
import { useUser } from '@/contexts/UserContext';
import "@/styles/global.css";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useState } from "react";
import { Outlet, useRevalidator } from "react-router-dom";




export const PercentageChange = createContext(0);
function Layout() {
    let revalidator = useRevalidator();
    const [percentageChange, setPercentageChange] = useState(0);
    const queryClient = useQueryClient();


    const theme = useTheme();
    const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const user = useUser();
    const username = user?.username || 'Guest';
    const isEnabled = user?.enabled || 'false'

    const [showModal, setShowModal] = useState(!isEnabled);
    const { data: friendRequestsLength, isLoading: friendRequestsLengthLoading, error: friendRequestsLengthError } = useQuery({
        queryKey: ['friendRequestsLength'],
        queryFn: getFriendRequestLength
    });

    const { mutate: addApiKeyMutation, isPending } = useMutation({
        mutationFn: addApiKey,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["authStatus"] })
            setShowModal(false);
            toast.success("Setup completed successfully!");
        },
        onError: () => {
            toast.error("Setup failed. Please try again.");
        },
    });

    const handleApiKeySubmit = (data) => {
        addApiKeyMutation(data);
    };


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
                                onSubmit={handleApiKeySubmit}
                                isPending={isPending}
                            />
                        )}
                    </Box>
                </Box>
            </PercentageChange.Provider>
        </>
    );
};

export default Layout