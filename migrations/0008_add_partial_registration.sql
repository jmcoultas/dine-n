-- Add is_partial_registration boolean column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_partial_registration BOOLEAN DEFAULT FALSE;

-- Update any existing users that might be in a partial state (with password starting with 'TEMPORARY_')
UPDATE users SET is_partial_registration = TRUE 
WHERE password_hash LIKE 'TEMPORARY_%'; 