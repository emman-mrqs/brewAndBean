-- Update users table with suspension fields
-- Run this in your PostgreSQL database (brewAndBean)

-- Add suspension-related columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_title VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_at TIMESTAMP;

-- Add index for better query performance on suspended users
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users(is_suspended);

-- Add index for suspension_at to help with temporal queries
CREATE INDEX IF NOT EXISTS idx_users_suspension_at ON users(suspension_at);

-- Optional: Add comment to describe the columns
COMMENT ON COLUMN users.is_suspended IS 'Flag to indicate if the user account is currently suspended';
COMMENT ON COLUMN users.suspension_title IS 'Title/subject of the suspension notice';
COMMENT ON COLUMN users.suspension_reason IS 'Detailed reason for the user suspension';
COMMENT ON COLUMN users.suspension_at IS 'Timestamp when the suspension was applied';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name IN ('is_suspended', 'suspension_title', 'suspension_reason', 'suspension_at')
ORDER BY ordinal_position;
