import { getUserName } from "@/api/user";
import { getFriendRequest } from "@/api/friend";
import Greetings from "@/components/Greetings";
import Sidebar from "@/components/Sidebar";
import { Box } from "@mui/material";
import { createContext, useState } from "react";
import {  Outlet, useLoaderData } from "react-router-dom";
import { useEffect } from "react";
import "@/styles/global.css";



export const loader = async () => {
    try {
        const userName = await getUserName();
        const friendRequests = await getFriendRequest();

        return { userName, friendRequests };
    } catch (error) {
        console.error("Error in loader:", error);
        return { userName: null, friendRequests: [] };
    }
};

export const PercentageChange = createContext(0);

function Layout() {

    const data = useLoaderData();
    const [percentageChange, setPercentageChange] = useState(0);
    const username = data.userName;
    const friendRequests = data.friendRequests;
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
                            <Greetings username={username} friendRequests={friendRequests} />
                            <Outlet userName={username} context={friendRequests} />
                        </Box>
                    </Box>
            </PercentageChange.Provider>
        </>
    );
};

export default Layout