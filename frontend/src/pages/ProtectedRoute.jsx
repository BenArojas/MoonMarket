import { getUserName, getFriendRequest } from "@/api/user";
import Greetings from "@/components/Greetings";
import Sidebar from "@/components/Sidebar";
import { Box } from "@mui/material";
import { createContext, useState } from "react";
import { Navigate, Outlet, useLoaderData } from "react-router-dom";
import { useAuth } from "../contexts/AuthProvider";
import { useRefreshToken } from "@/contexts/RefreshTokenProvider";
import { useEffect } from "react";
import { json } from "react-router-dom";


export const loader = (token) => async () => {
  // console.log("loader activated")
  const userName = await getUserName(token);
  const friendRequests = await getFriendRequest(token);
  // console.log("user: " , user.data)
  return { userName, friendRequests };
};

export const PercentageChange = createContext(0);
export const FirstLetter = createContext();

export const ProtectedRoute = () => {
  const { token } = useAuth();
  const { initializeTokenRefresh } = useRefreshToken();

  useEffect(() => {
    if (token) {
      initializeTokenRefresh(token, "PT20M");
    }
  }, [token, initializeTokenRefresh]);

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

// export const action = async ({ request }) => {
//   const formData = await request.formData();
//   const { _action, ...rest } = Object.fromEntries(formData);
//   console.log(_action, rest);
//   const { requestId, token } = rest;
//   if (_action === "accept") {
//     const result = await answerFriendRequest(
//       requestId.toString(),
//       "accept",
//       token.toString()
//     );
//   }
//   if (_action === "reject") {
//     const result = await answerFriendRequest(
//       requestId.toString(),
//       "reject",
//       token.toString()
//     );
//   }
//   return json({});
// };
