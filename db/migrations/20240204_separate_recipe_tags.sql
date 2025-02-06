BEGIN;

-- Add new columns
ALTER TABLE temporary_recipes
ADD COLUMN IF NOT EXISTS meal_type TEXT,
ADD COLUMN IF NOT EXISTS cuisine_type TEXT,
ADD COLUMN IF NOT EXISTS dietary_restrictions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS difficulty TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_temp_recipes_meal_type ON temporary_recipes(meal_type);
CREATE INDEX IF NOT EXISTS idx_temp_recipes_cuisine_type ON temporary_recipes(cuisine_type);
CREATE INDEX IF NOT EXISTS idx_temp_recipes_difficulty ON temporary_recipes(difficulty);

-- Migrate existing tag data
UPDATE temporary_recipes
SET 
  meal_type = CASE 
    WHEN tags ? 'Breakfast' THEN 'Breakfast'
    WHEN tags ? 'Lunch' THEN 'Lunch'
    WHEN tags ? 'Dinner' THEN 'Dinner'
    WHEN tags ? 'Snack' THEN 'Snack'
    WHEN tags ? 'Dessert' THEN 'Dessert'
    ELSE NULL
  END,
  cuisine_type = CASE 
    WHEN tags ? 'Italian' THEN 'Italian'
    WHEN tags ? 'Mexican' THEN 'Mexican'
    WHEN tags ? 'Chinese' THEN 'Chinese'
    WHEN tags ? 'Japanese' THEN 'Japanese'
    WHEN tags ? 'Indian' THEN 'Indian'
    WHEN tags ? 'Thai' THEN 'Thai'
    WHEN tags ? 'Mediterranean' THEN 'Mediterranean'
    WHEN tags ? 'American' THEN 'American'
    WHEN tags ? 'French' THEN 'French'
    ELSE 'Other'
  END,
  dietary_restrictions = (
    SELECT jsonb_agg(r.restriction)
    FROM (
      SELECT restriction
      FROM (
        VALUES 
          ('Vegetarian'),
          ('Vegan'),
          ('Gluten-Free'),
          ('Dairy-Free'),
          ('Keto'),
          ('Paleo'),
          ('Low-Carb')
      ) AS t(restriction)
      WHERE tags ? restriction
    ) r
  ),
  difficulty = CASE 
    WHEN complexity = 1 THEN 'Easy'
    WHEN complexity = 2 THEN 'Moderate'
    WHEN complexity = 3 THEN 'Advanced'
    ELSE 'Moderate'
  END;

-- Remove migrated tags from the tags array
UPDATE temporary_recipes t
SET tags = tags - ARRAY[
  'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert',
  'Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian', 'Thai', 'Mediterranean', 'American', 'French',
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo', 'Low-Carb'
]::text[];

COMMIT;

-- Rollback script (in case needed):
/*
BEGIN;
DROP INDEX IF EXISTS idx_temp_recipes_meal_type;
DROP INDEX IF EXISTS idx_temp_recipes_cuisine_type;
DROP INDEX IF EXISTS idx_temp_recipes_difficulty;

ALTER TABLE temporary_recipes
DROP COLUMN IF EXISTS meal_type,
DROP COLUMN IF EXISTS cuisine_type,
DROP COLUMN IF EXISTS dietary_restrictions,
DROP COLUMN IF EXISTS difficulty;
COMMIT;
*/ 