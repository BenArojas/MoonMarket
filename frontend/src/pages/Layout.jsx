import { useState, useEffect, createContext } from "react";
import { getUserName, addApiKey } from "@/api/user";
import { getFriendRequestLength } from "@/api/friend";
import Greetings from "@/components/Greetings";
import Sidebar from "@/components/Sidebar";
import { Outlet, useOutletContext } from "react-router-dom";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import "@/styles/global.css";
import { useQuery } from "@tanstack/react-query";
import AddApiKey from "@/components/AddApiKey";
import { useRevalidator } from "react-router-dom";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { getHistoricalData } from "@/api/stock";



export const PercentageChange = createContext(0);
function Layout() {
    let revalidator = useRevalidator();
    const isEnabled = useOutletContext()
    const [showModal, setShowModal] = useState(!isEnabled);
    const [percentageChange, setPercentageChange] = useState(0);
    const queryClient = useQueryClient();


    const theme = useTheme();
    const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const { data: userName, isLoading: userNameLoading, error: userNameError } = useQuery({
        queryKey: ['userName'],
        queryFn: getUserName
    });

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

    useQuery({
        queryKey: ["stockData", "BTCUSD"],
        queryFn: () => getHistoricalData("BTCUSD"),
        notifyOnChangeProps: ["data"]
    })
    // useEffect(() => {
    //     // Prefetch BTCUSD data
    //     const prefetchData = async () => {
    //         await queryClient.prefetchQuery({
    //             queryKey: ["stockData", "BTCUSD"],
    //             queryFn: () => getHistoricalData("BTCUSD")
    //         });
    //     }
    //     prefetchData()
    // }, []);

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
                        <Greetings username={userName} friendRequestsCount={friendRequestsLength} />
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