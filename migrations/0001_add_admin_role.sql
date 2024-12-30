CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY
);

-- Add isAdmin column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "is_admin" boolean NOT NULL DEFAULT false;

-- Update schema_migrations
INSERT INTO schema_migrations (version) 
VALUES ('0001_add_admin_role');
