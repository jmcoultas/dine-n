ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "meal_plans_generated" integer DEFAULT 0 NOT NULL;
