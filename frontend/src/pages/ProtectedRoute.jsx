import { getUserName } from "@/api/user";
import { getFriendRequest } from "@/api/friend";
import Greetings from "@/components/Greetings";
import Sidebar from "@/components/Sidebar";
import { Box } from "@mui/material";
import { createContext, useState } from "react";
import { Navigate, Outlet, useLoaderData} from "react-router-dom";
import { useAuth } from "../contexts/AuthProvider";
import { useRefreshToken } from "@/contexts/RefreshTokenProvider";
import { useEffect} from "react";
import "@/styles/global.css";


export const loader = (token) => async () => {
  const userName = await getUserName(token);
  const friendRequests = await getFriendRequest(token);

  return { userName, friendRequests };
};

export const PercentageChange = createContext(0);
export const FirstLetter = createContext();

export const ProtectedRoute = () => {
  const { token, refreshToken , tokenExpiry } = useAuth();
  const { initializeTokenRefresh } = useRefreshToken();

  useEffect(() => {
    let refreshTimeout;
    if (refreshToken && tokenExpiry) {
      refreshTimeout = initializeTokenRefresh(refreshToken, tokenExpiry);
    }
    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [refreshToken, tokenExpiry, initializeTokenRefresh]);

  const data = useLoaderData();
  const [percentageChange, setPercentageChange] = useState(0);
  const username = data.userName.data;
  const friendRequests = data.friendRequests;
  const firstLetter = Array.from(username)[0];
  // todo: need to check if the token is acutally valid and not just exist
  // Check if the user is authenticated
  if (!token) {
    // If not authenticated, redirect to the login page
    return <Navigate to="/login" replace={true} />;
  }

  // If authenticated, render the child routes
  return (
    <>
      <PercentageChange.Provider
        value={{
          percentageChange,
          setPercentageChange,
        }}
      >
        <FirstLetter.Provider value={{ firstLetter }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              height: "100%",
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
              <Outlet context={friendRequests} />
            </Box>
          </Box>
        </FirstLetter.Provider>
      </PercentageChange.Provider>
    </>
  );
};

