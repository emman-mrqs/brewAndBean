-- Add suspension fields to users table
-- Run this in your PostgreSQL database (brewAndBean)

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_end_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by INTEGER;

-- Create index for suspended users
CREATE INDEX IF NOT EXISTS idx_users_suspended ON users(is_suspended);
