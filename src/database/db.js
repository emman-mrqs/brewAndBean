// src/database/db.js
import pkg from "pg";
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

// Determine if we're in production mode
const isProduction = process.env.NODE_ENV === "production";

const { Pool } = pkg;

const db = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : undefined,
  port: Number(process.env.DB_PORT) || 5432,
  // If you're on a managed DB that requires SSL, uncomment:
   ssl: isProduction ? { rejectUnauthorized: false } : false,

});

// Optional: quick sanity check at boot (remove if you prefer)
db.query("SELECT 1").catch(err => {
  console.error("DB connection failed:", err);
  process.exit(1);
});

export default db;
