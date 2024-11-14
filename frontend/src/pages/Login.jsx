import { useNavigate, Form, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { TextField, Box, Card, Typography, Button } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from "@/api/axios";




const StyledTextField = styled(TextField)({
  "& .MuiInputBase-input": {
    "&:-webkit-autofill": {
      WebkitBoxShadow: "0 0 0 1000px transparent inset",
      WebkitTextFillColor: "white",
      caretColor: "white",
      transition: "background-color 5000s ease-in-out 0s",
    },
    "&:-webkit-autofill:hover": {
      WebkitTextFillColor: "white",
      caretColor: "white",
    },
    "&:-webkit-autofill:focus": {
      WebkitTextFillColor: "white",
      caretColor: "white",
    },
    "&:-webkit-autofill:active": {
      WebkitTextFillColor: "white",
      caretColor: "white",
    },
  },
});

const Login = () => {
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await api.post('/auth/login', 
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      return response.data;
    },
    onSuccess: (data) => {
      navigate("/home", { replace: true, state: { shouldUpdatePrices: true } });
    },
    onError: (error) => {
      console.error('Login error:', error.response?.data || error.message);
    }
  });

  const onSubmit = (data) => {
    loginMutation.mutate({
      email: data.email,
      password: data.password
    });
  };

  return (
    <Box
      sx={{
        background: "linear-gradient(to right, #062621 35%, #24201f 55%)",
        padding: "1rem",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Card
        sx={{
          display: "flex",
          width: 1200,
          height: 600,
          boxShadow: "0px 0px 0px 8px rgba(0, 0, 0, 0.3)",
        }}
      >
        <Box
          sx={{
            width: "100%",
            backgroundImage: `url('/login_stocks.jpg')`,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        >
          <Box sx={{ width: 300, height: 300 }}>
            <img src="/moonMarket-Photoroom.png" alt="Moon Market Logo" />
          </Box>
        </Box>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#24201f",
            gap: 8,
          }}
        >
          <Box
            component={Form}
            onSubmit={handleSubmit(onSubmit)}
            method="post"
            action="/login"
            sx={{
              padding: 4,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              width: 350,
            }}
          >
            <Typography variant="h5">Login to your account</Typography>
            
            {loginMutation.error && (
              <Typography color="error">
                {loginMutation.error.response?.data?.detail || 
                 "An unexpected error occurred. Please try again."}
              </Typography>
            )}

            <StyledTextField
              {...register("email", {
                required: true,
              })}
              type="email"
              placeholder="Email"
              error={!!errors.email}
              helperText={errors.email && "Email is required"}
            />

            <TextField
              {...register("password", {
                required: true,
              })}
              type="password"
              placeholder="Password"
              error={!!errors.password}
              helperText={errors.password && "Password is required"}
            />

            <Button 
              variant="contained" 
              type="submit"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </Button>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography color="Gray">Don't have an account yet?</Typography>
            <Link
              to={"/register"}
              style={{
                color: "white",
              }}
            >
              Create an account
            </Link>
          </Box>
        </Box>
      </Card>
    </Box>
  );
};

export default Login;