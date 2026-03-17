import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);

app.get("/", (req, res) => {
  res.send("Backend API is running!");
});

app.get("/test-db", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .limit(1);

    if (error) throw error;

    res
      .status(200)
      .json({ message: "Connected to postgreSQL via Supabase", data: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
export default app;
