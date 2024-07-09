import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { getUserName } from "@/api/user";
import { useLoaderData } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { useEffect, useState, createContext } from "react";
import { Box } from "@mui/material";
import Greetings from "@/components/Greetings";

export const loader = (token) => async () => {
  // console.log("loader activated")
  const userName = await getUserName(token);
  // console.log("user: " , user.data)
  return userName;
};

export const GraphContext = createContext();

export const ProtectedRoute = () => {
  const { token } = useAuth();
  const data = useLoaderData();
  const [selectedGraph, setSelectedGraph] = useState("Treemap");
  const [percentageChange, setPercentageChange] = useState(0);
  const username = data.data;
  // todo: need to check if the token is acutally valid and not just exist
  // Check if the user is authenticated
  if (!token) {
    // If not authenticated, redirect to the login page
    return <Navigate to="/login" replace={true} />;
  }

  // useEffect(() => {
  //   console.log(selectedGraph);
  // }, [selectedGraph]);

  // If authenticated, render the child routes
  return (
    <>
      <GraphContext.Provider value={{ selectedGraph, setSelectedGraph,percentageChange, setPercentageChange }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
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
            <Greetings username={username} />
            <Outlet />
          </Box>
        </Box>
      </GraphContext.Provider>
    </>
  );
};
