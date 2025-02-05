-- Add favorites_count column to temporary_recipes table
BEGIN;

-- Add the new column
ALTER TABLE temporary_recipes 
ADD COLUMN IF NOT EXISTS favorites_count INTEGER NOT NULL DEFAULT 0;

-- Update the favorites_count for existing recipes by counting how many users have favorited each recipe
WITH favorite_counts AS (
  SELECT name, COUNT(*) as total_favorites
  FROM temporary_recipes
  WHERE favorited = true
  GROUP BY name
)
UPDATE temporary_recipes t
SET favorites_count = COALESCE(fc.total_favorites, 0)
FROM favorite_counts fc
WHERE t.name = fc.name;

-- Create an index on favorites_count for better performance on community recipes query
CREATE INDEX IF NOT EXISTS idx_temp_recipes_favorites_count ON temporary_recipes(favorites_count DESC);

COMMIT;

-- Rollback script (in case needed):
/*
BEGIN;
DROP INDEX IF EXISTS idx_temp_recipes_favorites_count;
ALTER TABLE temporary_recipes DROP COLUMN IF EXISTS favorites_count;
COMMIT;
*/ 