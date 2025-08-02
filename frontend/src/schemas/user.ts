import { z } from "zod";

// Define the schema for user registration form
export const userRegisterSchema = z.object({
    username: z.string({ required_error: "Username is required" }).min(3, { message: "Username must be at least 3 characters long" }).max(30, { message: "Username must not exceed 30 characters" }),
    email: z.string({ required_error: "Email is required" }).email({ message: "Invalid email address" }),
    password: z.string({ required_error: "Password is required" }).min(5, { message: "Password must be at least 5 characters long" }).max(12, { message: "Password must not exceed 12 characters" }),
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

// Export the inferred TypeScript type from the schema
export type UserRegisterFormData = z.infer<typeof userRegisterSchema>;