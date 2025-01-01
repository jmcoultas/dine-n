
-- Add favorited column to temporary_recipes table
ALTER TABLE temporary_recipes
ADD COLUMN favorited BOOLEAN NOT NULL DEFAULT false;
