-- Drop the password_hash column as it's no longer needed
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- Add firebase_uid column if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'firebase_uid') THEN
        ALTER TABLE users ADD COLUMN firebase_uid TEXT;
    END IF;
END $$;

-- Make firebase_uid required and unique
ALTER TABLE users 
    ALTER COLUMN firebase_uid SET NOT NULL,
    ADD CONSTRAINT users_firebase_uid_unique UNIQUE (firebase_uid);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid); 