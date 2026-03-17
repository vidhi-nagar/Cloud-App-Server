import { z } from "zod";

// 1. Signup Schema (Rules)
export const signupSchema = z.object({
  full_name: z.string().min(3, "Name must be 3+ chars"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be 6+ chars"),
});

// 2. Login Schema (Rules)
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
