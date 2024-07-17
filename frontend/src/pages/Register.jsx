
import { useNavigate, Form } from "react-router-dom";
import { useAuth } from "../contexts/AuthProvider";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { TextField, Box, Card, Typography, Button } from "@mui/material";
import WebsiteName from '@/components/WebsiteName';
import { RegisterUser } from '@/api/user'
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
        criteriaMode: 'all'
    });

    const onSubmit = async (data) => {
        if (data.password === data.confirmPassword) {
            const user = {
                email: data.email,
                username: data.username,
                password: data.password,
                deposits: [{
                    amount: parseFloat(data.initialDeposit),
                    date: new Date().toISOString() // Current date and time in ISO format
                }]
            }
            try {
                const response = await RegisterUser(user)
                if (response.status === 200) {
                    navigate("/login", { replace: true });
                }
                // console.log(response)
            }
            catch (error) {
                console.log("An error occurred while registering");
            }
        }
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
                action="/register"
                sx={{ padding: 4, display: "flex", flexDirection: "column", gap: 3, width: '400px' }}
            >
                <WebsiteName />
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
            </Card>
        </Box>
    );
};


export default Register