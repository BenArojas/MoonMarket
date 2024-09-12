import { useEffect } from "react";
import { getUserName } from "@/api/user";
import { getFriendRequestLength } from "@/api/friend";
import Greetings from "@/components/Greetings";
import Sidebar from "@/components/Sidebar";
import { Box } from "@mui/material";
import { createContext, useState } from "react";
import { Outlet, useLoaderData } from "react-router-dom";
import "@/styles/global.css";
import { useQuery } from "@tanstack/react-query";






export const PercentageChange = createContext(0);

function Layout() {

    const { data: userName, isLoading: userNameLoading, error: userNameError } = useQuery({
        queryKey: ['userName'],
        queryFn: getUserName
    });

    const { data: friendRequestsLength, isLoading: friendRequestsLengthLoading, error: friendRequestsLengthError } = useQuery({
        queryKey: ['friendRequestsLength'],
        queryFn: getFriendRequestLength
    });

    const [percentageChange, setPercentageChange] = useState(0);
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
                        <Outlet context={friendRequestsLength} />
                    </Box>
                </Box>
            </PercentageChange.Provider>
        </>
    );
};

export default Layout