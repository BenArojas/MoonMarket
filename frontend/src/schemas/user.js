import { z } from "zod";

export const userRegisterSchema = z.object({
    username: z.string({ required_error: "Username is required" }).min(3).max(30),
    email: z.string({ required_error: "Email is required" }).email(),
    password: z.string({ required_error: "Password is required" }).min(5).max(12),
    confirmPassword: z.string({ required_error: "Confirm password is required" }),
    initialDeposit: z.number({
        coerce: true,
        required_error: "Initial deposit is required",
        invalid_type_error: "Initial deposit must be a number",
    }).positive({ message: "Initial deposit must be positive" }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});