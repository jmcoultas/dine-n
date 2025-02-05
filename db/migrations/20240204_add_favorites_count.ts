import { sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function up(db: PostgresJsDatabase) {
  await db.execute(sql`
    ALTER TABLE recipes 
    ADD COLUMN favorites_count INTEGER NOT NULL DEFAULT 0;

    -- Update the favorites_count for existing recipes
    UPDATE recipes r 
    SET favorites_count = (
      SELECT COUNT(*) 
      FROM user_recipes ur 
      WHERE ur.recipe_id = r.id
    );
  `);
}

export async function down(db: PostgresJsDatabase) {
  await db.execute(sql`
    ALTER TABLE recipes 
    DROP COLUMN favorites_count;
  `);
} 