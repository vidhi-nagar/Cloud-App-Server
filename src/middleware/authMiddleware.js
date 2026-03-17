import { supabase } from "../config/supabase.js";

export const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

  if (!token) return res.status(401).json({ error: "Access Denied" });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return res.status(401).json({ error: "Invalid Token" });

  req.user = user; // User details ko request mein save karna
  next();
};
