import { sql } from "drizzle-orm";
import { db } from "../index";

export async function up() {
  // First drop the existing foreign key constraint
  await db.execute(sql`
    ALTER TABLE meal_plan_recipes
    DROP CONSTRAINT meal_plan_recipes_recipe_id_fkey;
  `);

  // Add new foreign key constraint referencing temporary_recipes
  await db.execute(sql`
    ALTER TABLE meal_plan_recipes
    ADD CONSTRAINT meal_plan_recipes_recipe_id_fkey
    FOREIGN KEY (recipe_id)
    REFERENCES temporary_recipes(id)
    ON DELETE CASCADE;
  `);
}

export async function down() {
  // First drop the new foreign key constraint
  await db.execute(sql`
    ALTER TABLE meal_plan_recipes
    DROP CONSTRAINT meal_plan_recipes_recipe_id_fkey;
  `);

  // Restore the original foreign key constraint
  await db.execute(sql`
    ALTER TABLE meal_plan_recipes
    ADD CONSTRAINT meal_plan_recipes_recipe_id_fkey
    FOREIGN KEY (recipe_id)
    REFERENCES recipes(id)
    ON DELETE CASCADE;
  `);
} 