import express from "express";
const router = express.Router();

// Import Controller
import { renderSignup } from "../controller/signupController.js";



router.get("/signup", renderSignup);


export default router;