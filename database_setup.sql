-- PostgreSQL table creation for Bean & Brew authentication system
-- Run this SQL in your PostgreSQL database

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(6),
    verification_expires TIMESTAMP,
    auth_provider TEXT DEFAULT 'local',
    provider_id TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification ON users(verification_code, verification_expires);
CREATE INDEX idx_users_verified ON users(is_verified);

-- Password reset table for forgot password functionality
CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    reset_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(email)
);

-- Create indexes for password resets
CREATE INDEX idx_password_resets_email ON password_resets(email);
CREATE INDEX idx_password_resets_code ON password_resets(reset_code);
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);

-- Optional: Add some constraints
ALTER TABLE users ADD CONSTRAINT chk_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE users ADD CONSTRAINT chk_phone_format 
    CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$');

-- Sample data (optional - remove if not needed)
-- INSERT INTO users (first_name, last_name, email, phone, password, is_verified) 
-- VALUES ('John', 'Doe', 'john@example.com', '+1234567890', '$2b$12$hashedpassword', true);