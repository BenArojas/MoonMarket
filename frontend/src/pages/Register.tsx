import { useNavigate, Form, Link } from "react-router-dom";
import { FieldErrors, SubmitHandler, useForm } from "react-hook-form";
import {
  TextField,
  Box,
  Card,
  Typography,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { RegisterUser } from "@/api/user";
import { zodResolver } from "@hookform/resolvers/zod";
import { userRegisterSchema } from "@/schemas/user";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface FormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  initialDeposit: string;
}
interface ErrorMessageProps {
  errors: FieldErrors<FormData>;
  name: keyof FormData;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ errors, name }) => {
  if (!errors[name]) return null;
  return <Typography color="error">{errors[name]?.message}</Typography>;
};

function Register() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(userRegisterSchema),
    criteriaMode: "all",
  });

  const onSubmit: SubmitHandler<FormData> = async (data: FormData) => {
    if (data.password === data.confirmPassword) {
      const user = {
        email: data.email.toLowerCase(),
        username: data.username,
        password: data.password,
        deposits: [
          {
            amount: parseFloat(data.initialDeposit),
            date: new Date().toISOString(),
          },
        ],
      };
      try {
        const response = await RegisterUser(user);
        if (response.status === 200) {
          toast.success("User registered successfully");
          navigate("/login", { replace: true });
        }
      } catch (error) {
        console.log("An error occurred while registering");
      }
    }
  };

  return (
    <Box
      sx={{
        background: "linear-gradient(to right, #205462 35%, #24201f 55%)",
        padding: isMobileScreen ? "0.5rem" : "1rem",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Card
        component={Form}
        onSubmit={handleSubmit(onSubmit)}
        method="post"
        action="/register"
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
            backgroundImage: `url('/register_page.webp')`,
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
            gap: 3,
            background: "#24201f",
            padding: isMobileScreen ? "1rem" : 0,
          }}
        >
          <Box
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
              Sign up
            </Typography>
            <TextField {...register("email", { required: true })} type="email" placeholder="Email" />
            <ErrorMessage errors={errors} name="email" />

            <TextField {...register("username", { required: true })} type="name" placeholder="Username" />
            <ErrorMessage errors={errors} name="username" />

            <TextField {...register("password", { required: true })} type="password" placeholder="Password" />
            <ErrorMessage errors={errors} name="password" />

            <TextField {...register("confirmPassword", { required: true })} type="password" placeholder="Confirm Password" />
            <ErrorMessage errors={errors} name="confirmPassword" />

            <TextField {...register("initialDeposit", { required: true })} placeholder="Initial Deposit" />
            <ErrorMessage errors={errors} name="initialDeposit" />

            <Button variant="contained" type="submit">
              Register
            </Button>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Typography sx={{ color: "grey" }}>Already have an account?</Typography>
            <Link
              to="/login"
              style={{
                color: "white",
              }}
            >
              Login
            </Link>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}

export default Register;
