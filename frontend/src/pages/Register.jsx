import { useNavigate, Form, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { TextField, Box, Card, Typography, Button } from "@mui/material";
import { RegisterUser } from "@/api/user";
import { zodResolver } from "@hookform/resolvers/zod";
import { userRegisterSchema } from "@/schemas/user";

const ErrorMessage = ({ errors, name }) => {
  if (!errors[name]) return null;
  return <Typography color="error">{errors[name].message}</Typography>;
};

function Register() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userRegisterSchema),
    criteriaMode: "all",
  });

  const onSubmit = async (data) => {
    if (data.password === data.confirmPassword) {
      const user = {
        email: data.email,
        username: data.username,
        password: data.password,
        deposits: [
          {
            amount: parseFloat(data.initialDeposit),
            date: new Date().toISOString(), // Current date and time in ISO format
          },
        ],
      };
      try {
        const response = await RegisterUser(user);
        if (response.status === 200) {
          navigate("/login", { replace: true });
        }
        // console.log(response)
      } catch (error) {
        console.log("An error occurred while registering");
      }
    }
  };

  return (
    <Box
      sx={{
        background: "linear-gradient(to right, #205462 35%, #24201f 55%)",
        padding: "1rem",
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
          width: 1200,
          height: 600,
          boxShadow: "0px 0px 0px 8px rgba(0, 0, 0, 0.3)",
        }}
      >
        <Box
          sx={{
            width: "100%",
            backgroundImage: `url('/register_stocks.jpg')`,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        >
          <Box sx={{
            width: 300, height: 300
          }}>
            <img src="/moonMarket-Photoroom.png"></img>
          </Box>
        </Box>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 3,
            background: '#24201f'
          }}
        >
          <Box
            sx={{
              padding: 4,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              width: 350,
            }}
          >
            <Typography variant="h5">Sign up</Typography>
            <TextField
              {...register("email", {
                required: true,
              })}
              type="email"
              placeholder="Email"
            />
            <ErrorMessage errors={errors} name="email" />
            <TextField
              {...register("username", {
                required: true,
              })}
              type="name"
              placeholder="Username"
            />
            <ErrorMessage errors={errors} name="username" />
            <TextField
              {...register("password", {
                required: true,
              })}
              type="password"
              placeholder="Password"
            />
            <ErrorMessage errors={errors} name="password" />
            <TextField
              {...register("confirmPassword", {
                required: true,
              })}
              type="password"
              placeholder="Confirm Password"
            />
            <ErrorMessage errors={errors} name="confirmPassword" />
            <TextField
              {...register("initialDeposit", {
                required: true,
              })}
              placeholder="Initial Deposit"
            />
            <ErrorMessage errors={errors} name="initialDeposit" />
            <Button variant="contained" type="submit">
              Register
            </Button>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography sx={{ color: "grey" }}>
              Already have an account?
            </Typography>
            <Link
              to={"/login"}
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
