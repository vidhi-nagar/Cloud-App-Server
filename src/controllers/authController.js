import { supabase } from "../config/supabase.js";
import { signupSchema, loginSchema } from "../validators/authValidator.js";

// --- SIGNUP LOGIC ---
export const registerUser = async (req, res) => {
  try {
    const validatedData = signupSchema.parse(req.body); // Zod check

    const { email, password, full_name } = validatedData;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });

    if (error) throw error;

    const user = data.user;

    if (user) {
      // 2. Apni 'profiles' table mein entry insert karein 👈 YEH MISSING HAI
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: user.id, // Auth user ki ID hi profile ki ID honi chahiye
          email: email,
          full_name: full_name,
        },
      ]);

      if (profileError) {
        console.log("Profile Insert Error:", profileError);
      }
    }
    res
      .status(201)
      .json({ message: "Check your email for verification!", user: data.user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// --- LOGIN LOGIC ---
export const loginUser = async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) throw error;
    // Supabase automatically returns a JWT (access_token)
    res
      .status(200)
      .json({ message: "Login Successful", session: data.session });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Google OAuth Login
export const googleLogin = async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Login ke baad user kahan wapas aayega (aapka frontend URL)
        redirectTo: process.env.FRONTEND_URL,
      },
    });

    if (error) throw error;

    // Supabase humein ek URL deta hai jahan user ko redirect karna hota hai
    res.status(200).json({ url: data.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- LOGOUT LOGIC ---
export const logoutUser = async (req, res) => {
  try {
    // Supabase session ko khatam kar deta hai
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    res.status(200).json({ message: "Logged out successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", req.user.id);

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: "User profile not found" });
    }

    if (error) throw error;
    res.status(200).json({ user: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
