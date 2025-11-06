//Import NPM
import express from "express";                    
import bodyParser from "body-parser";

import { dirname, join } from "path";
import { fileURLToPath } from "url";


const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;


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

//Import Routes
import loginRoutes from "./src/routes/LoginRoutes.js"
import signupRoutes from "./src/routes/signupRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";



//Auth Routes
app.use("/", loginRoutes);
app.use("/", signupRoutes);

//User Routes
app.use("/", userRoutes);

//Admin Routes
app.use("/", adminRoutes);



app.listen(port, () => {
    console.log(`Backend server is running on http://localhost:${port}`);
});