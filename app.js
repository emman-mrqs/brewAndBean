// Load environment variables FIRST
import dotenv from "dotenv";
dotenv.config({ debug: false });

//Import NPM
import express from "express";                    
import bodyParser from "body-parser";
import session from "express-session";

import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

// Import middleware
import { sessionConfig, attachUserToViews } from "./src/middleware/auth.js";

// Session configuration
app.use(session(sessionConfig));

// Passport (for OAuth)
import passport from 'passport';
import configurePassport from './src/config/passport.js';

// Configure passport strategies
configurePassport(passport);

// Initialize passport middlewares (after session)
app.use(passport.initialize());
app.use(passport.session());

// Serve /src/public as your static root
app.use(express.static(join(__dirname, "src", "public")));

// Tell Express where the View folder 
app.set("views", join(__dirname, "src", "views")); // Views Folder
app.set("view engine", "ejs");

//Public Folder
app.use(express.static(join(__dirname, "src", "public")));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Attach user to views
app.use(attachUserToViews);

//Import Routes
import loginRoutes from "./src/routes/LoginRoutes.js"
import signupRoutes from "./src/routes/signupRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import adminAuthRoutes from "./src/routes/adminAuthRoutes.js";

//Auth Routes (simplified to direct routes)
app.use("/", loginRoutes);
app.use("/", signupRoutes);
// Admin auth (hidden path)
app.use("/", adminAuthRoutes);

//User Routes
app.use("/", userRoutes);

//Admin Routes
app.use("/", adminRoutes);

app.listen(port, () => {
    console.log(`Backend server is running on http://localhost:${port}`);
});