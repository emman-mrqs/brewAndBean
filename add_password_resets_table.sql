-- Add password reset table for forgot password functionality
-- Run this SQL in your PostgreSQL database

CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    reset_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(email)
);

-- Create indexes for password resets
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_code ON password_resets(reset_code);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

-- Clean up expired reset codes (optional maintenance query)
-- DELETE FROM password_resets WHERE expires_at < NOW();