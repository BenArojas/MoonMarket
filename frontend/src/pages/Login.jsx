
import { useNavigate, Form } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { useState } from "react";
import { loginUser, refreshJwtKey } from "@/api/user";
import { useForm } from "react-hook-form";
import { TextField, Box, Card, Typography, Button } from "@mui/material";
import WebsiteName from '@/components/WebsiteName';
import { styled } from '@mui/material/styles';

const StyledTextField = styled(TextField)({
  '& .MuiInputBase-input': {
    '&:-webkit-autofill': {
      WebkitBoxShadow: '0 0 0 1000px transparent inset',
      WebkitTextFillColor: 'white',
      caretColor: 'white',
      transition: 'background-color 5000s ease-in-out 0s',
    },
    '&:-webkit-autofill:hover': {
      WebkitTextFillColor: 'white',
      caretColor: 'white',
    },
    '&:-webkit-autofill:focus': {
      WebkitTextFillColor: 'white',
      caretColor: 'white',
    },
    '&:-webkit-autofill:active': {
      WebkitTextFillColor: 'white',
      caretColor: 'white',
    },
  },
});

const Login = () => {
  const { setToken } = useAuth();
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const handleLogin = async (jwtToken) => {
    await setToken(jwtToken);
    navigate("/portfolio", { replace: true });
  };

  const onSubmit = async (data) => {
    try {
      const response = await loginUser(data.email, data.password);
      // Handle the response from the server
      const { access_token, refresh_token, access_token_expires } =
        response.data;
      // console.log('Access token: ' + access_token, "Refresh token: " + refresh_token);
      scheduleTokenRefresh(refresh_token, access_token_expires);
      // Reset the form fields
      handleLogin(access_token);
    } catch (error) {
      // Handle the error
      if (error.response && error.response.data) {
        setError(error.response.data.detail);
      } else {
        console.log(error);
      }
    }
  };

  // Function to parse ISO 8601 durations
  async function parseISO8601Duration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;
    return (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
  }

  // Function to schedule the token refresh
  async function scheduleTokenRefresh(token, expiresIn) {
    // Convert the ISO 8601 duration to milliseconds
    const duration = await parseISO8601Duration(expiresIn);
    const delay = duration - 5000; // 5000 ms = 5 seconds

    // Schedule the token refresh
    setTimeout(() => refreshToken(token), delay);
  }

  async function refreshToken(token) {
    console.log("refreshing jwt key...");
    // Call your API to refresh the token
    const response = await refreshJwtKey(token);
    const { access_token } = response.data;

    // Update the tokens in your application
    await setToken(access_token);

    // Set up the next refresh
    await scheduleTokenRefresh(
      access_token,
      response.data.access_token_expires
    );
  }

  

  return (
    <Box
      sx={{
        height: "100vh",
        display: "grid",
        placeItems: "center",
        backgroundImage: "url(https://i.redd.it/exu4qasg7tr61.png)",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <Card
        component={Form}
        onSubmit={handleSubmit(onSubmit)}
        method="post"
        action="/login"
        sx={{ padding: 4, display: "flex", flexDirection: "column", gap: 4 }}
      >
        <WebsiteName/>
        {error && <div style={{ color: "white" }}>{error}</div>}
        <StyledTextField 
          {...register("email", {
            required: true,
          })}
          type="email"
          placeholder="Email"
        />

        <TextField
          {...register("password", {
            required: true,
          })}
          type="password"
          placeholder="Password"
        />

        <Button variant="contained" type="submit">
          Login
        </Button>
      </Card>
    </Box>
  );
};

export default Login;
