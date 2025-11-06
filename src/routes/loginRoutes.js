import express from "express";
const router = express.Router();

// Import Controller
import { renderLogin } from "../controller/loginController.js";


//Login
router.get("/login", renderLogin);


export default router;