import { useEffect } from "react";
import { getUserName } from "@/api/user";
import { getFriendRequestLength } from "@/api/friend";
import Greetings from "@/components/Greetings";
import Sidebar from "@/components/Sidebar";
import { Box } from "@mui/material";
import { createContext, useState } from "react";
import {  Outlet, useLoaderData } from "react-router-dom";
import "@/styles/global.css";
import { useQuery } from "@tanstack/react-query";




export const loader = async () => {
    try {
        const userName = await getUserName();
        const friendRequestsLength = await getFriendRequestLength();
        return { userName, friendRequestsLength };
    } catch (error) {
        console.error("Error in loader:", error);
        return { userName: null, friendRequests: [] };
    }
};

export const PercentageChange = createContext(0);

function Layout() {

    const { data: userName, isLoading: userNameLoading, error: userNameError } = useQuery({
        queryKey: ['userName'],
        queryFn: getUserName
      });

    const data = useLoaderData();
    const [percentageChange, setPercentageChange] = useState(0);
    const friendRequestsCount = data.friendRequestsLength;
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
                            <Greetings username={userName} friendRequestsCount={friendRequestsCount} />
                            <Outlet context={friendRequestsCount}/>
                        </Box>
                    </Box>
            </PercentageChange.Provider>
        </>
    );
};

export default Layout