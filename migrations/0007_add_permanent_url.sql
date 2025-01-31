
-- Add permanent_url column to temporary_recipes table
ALTER TABLE temporary_recipes
ADD COLUMN permanent_url TEXT;
