
import { useNavigate, Form } from "react-router-dom";
import { useAuth } from "../contexts/AuthProvider";
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
  const { setTokens } = useAuth();
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const handleLogin = async (token, refreshToken, tokenExpiry) => {
    await setTokens(token, refreshToken, tokenExpiry);
    navigate("/portfolio", { replace: true });
  };

  const onSubmit = async (data) => {
    try {
      const response = await loginUser(data.email, data.password);
      const { access_token, refresh_token, access_token_expires } = response.data;
      handleLogin(access_token, refresh_token, access_token_expires);
    } catch (error) {
      if (error.response && error.response.data) {
        setError(error.response.data.detail);
      } else {
        console.error("Login error:", error);
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };


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
