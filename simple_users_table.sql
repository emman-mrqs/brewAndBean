-- Simple users table creation for Bean & Brew
-- Run this in your PostgreSQL database (brewAndBean)

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_code TEXT,
    verification_expires TIMESTAMP,
    auth_provider TEXT DEFAULT 'local',
    provider_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create basic indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_code ON users(verification_code);