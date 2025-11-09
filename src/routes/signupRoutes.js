import express from "express";
const router = express.Router();

// Import Controllers
import { renderSignup, handleSignup, handleVerification } from "../controller/auth/signupController.js";
import { requireGuest } from "../middleware/auth.js";

// Signup routes
router.get("/signup", requireGuest, renderSignup);
router.post("/signup", requireGuest, handleSignup);

// Verification route for signup
router.post("/verify", handleVerification);

export default router;