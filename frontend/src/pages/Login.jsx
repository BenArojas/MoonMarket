import { useNavigate, Form, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  TextField,
  Box,
  Card,
  Typography,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useMutation } from "@tanstack/react-query";
import api from "@/api/axios";

const StyledTextField = styled(TextField)({
  "& .MuiInputBase-input": {
    "&:-webkit-autofill": {
      WebkitBoxShadow: "0 0 0 1000px transparent inset",
      WebkitTextFillColor: "white",
      caretColor: "white",
      transition: "background-color 5000s ease-in-out 0s",
    },
  },
});

const Login = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const { register, handleSubmit, formState: { errors } } = useForm();

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", password);

      const response = await api.post(
        "/auth/login",
        formData,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      return response.data;
    },
    onSuccess: () => {
      navigate("/home", { replace: true, state: { shouldUpdatePrices: true } });
    },
    onError: (error) => {
      console.error("Login error:", error.response?.data || error.message);
    },
  });

  const onSubmit = (data) => {
    loginMutation.mutate({ email: data.email, password: data.password });
  };

  return (
    <Box
      sx={{
        background: "linear-gradient(to right, #062621 35%, #24201f 55%)",
        padding: isMobileScreen ? "0.5rem" : "1rem",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Card
        sx={{
          display: "flex",
          flexDirection: isMobileScreen ? "column" : "row",
          width: isMobileScreen ? "95%" : 1200,
          height: isMobileScreen ? "auto" : 600,
          boxShadow: "0px 0px 0px 8px rgba(0, 0, 0, 0.3)",
        }}
      >
        <Box
          sx={{
            width: isMobileScreen ? "100%" : "50%",
            backgroundImage: `url('/login_page.webp')`,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        >
          <Box
            sx={{
              width: isMobileScreen ? "80%" : 300,
              height: "auto",
              margin: isMobileScreen ? "0 auto" : "initial",
            }}
          >
            <img
              src="/moonMarket-Photoroom.png"
              alt="Moon Market Logo"
              style={{ width: "100%", height: "auto" }}
            />
          </Box>
        </Box>
        <Box
          sx={{
            width: isMobileScreen ? "100%" : "50%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#24201f",
            gap: isMobileScreen ? 4 : 8,
            padding: isMobileScreen ? "1rem" : 0,
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
              gap: 2,
              width: isMobileScreen ? "100%" : 350,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                textAlign: isMobileScreen ? "center" : "left",
                fontSize: isMobileScreen ? "1.2rem" : "1.5rem",
              }}
            >
              Login to your account
            </Typography>

            {loginMutation.error && (
              <Typography color="error">
                {loginMutation.error.response?.data?.detail ||
                  "An unexpected error occurred. Please try again."}
              </Typography>
            )}

            <StyledTextField
              {...register("email", { required: true })}
              type="email"
              placeholder="Email"
              error={!!errors.email}
              helperText={errors.email && "Email is required"}
            />

            <TextField
              {...register("password", { required: true })}
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
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Typography color="Gray">Don't have an account yet?</Typography>
            <Link
              to="/register"
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
