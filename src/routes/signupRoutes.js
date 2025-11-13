import express from "express";
const router = express.Router();

// Import Controllers
import { renderSignup, handleSignup } from "../controller/auth/signupController.js";
import { renderVerification, handleVerification, handleResendCode } from "../controller/auth/verificationController.js";
import { requireGuest } from "../middleware/auth.js";

// Signup routes
router.get("/signup", requireGuest, renderSignup);
router.post("/signup", requireGuest, handleSignup);

// Verification routes
router.get("/verification", requireGuest, renderVerification);
router.post("/verify", handleVerification);
router.post("/resend-code", handleResendCode);

export default router;