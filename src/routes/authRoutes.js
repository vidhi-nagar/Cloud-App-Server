import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  googleLogin,
  getMe,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.get("/google", googleLogin);
router.get("/profile", protect, getMe);
router.post("/logout", protect, logoutUser); // Ye humara naya logout route hai

export default router;
