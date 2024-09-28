import { useState, useEffect, createContext } from "react";
import { getUserName, addApiKey } from "@/api/user";
import { getFriendRequestLength } from "@/api/friend";
import Greetings from "@/components/Greetings";
import Sidebar from "@/components/Sidebar";
import { Box } from "@mui/material";
import { Outlet, useLoaderData, useOutletContext } from "react-router-dom";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import "@/styles/global.css";
import { useQuery } from "@tanstack/react-query";
import AddApiKey from "@/components/AddApiKey";


export const PercentageChange = createContext(0);
function Layout() {
    
    const isEnabled = useOutletContext()
    const [showModal, setShowModal] = useState(!isEnabled);
    const [percentageChange, setPercentageChange] = useState(0);
    const queryClient = useQueryClient();
    
    const { data: userName, isLoading: userNameLoading, error: userNameError } = useQuery({
        queryKey: ['userName'],
        queryFn: getUserName
    });

    const { data: friendRequestsLength, isLoading: friendRequestsLengthLoading, error: friendRequestsLengthError } = useQuery({
        queryKey: ['friendRequestsLength'],
        queryFn: getFriendRequestLength
    });

    const addApiKeyMutation = useMutation({
        mutationFn: addApiKey,
        onSuccess: () => {
            queryClient.invalidateQueries('userData');
            setShowModal(false); // Close the modal on success
        },
        onError: () => {
            // Do nothing here to keep the modal open
            toast.error("Failed to add API key. Please try again.");
        },
    });

    const handleApiKeySubmit = (apiKey) => {
        addApiKeyMutation.mutate(apiKey)
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
                        overflow: "hidden"
                    }}
                >
                    <Sidebar></Sidebar>
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
                                onClose={() => setShowModal(false)}
                                onSubmit={handleApiKeySubmit}
                            />
                        )}
                    </Box>
                </Box>
            </PercentageChange.Provider>
        </>
    );
};

export default Layout