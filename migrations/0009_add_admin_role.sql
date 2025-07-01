-- Add is_admin boolean column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Create an index for faster admin lookups
CREATE INDEX IF NOT EXISTS users_is_admin_idx ON users (is_admin);
 
-- Optionally, you can manually set the first user as admin by uncommenting and updating the email below:
-- UPDATE users SET is_admin = TRUE WHERE email = 'your-admin-email@example.com' AND id = 1; 