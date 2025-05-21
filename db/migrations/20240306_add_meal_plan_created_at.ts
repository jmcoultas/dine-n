import { sql } from "drizzle-orm";
import { db } from "../index";

export async function up() {
  await db.execute(sql`
    ALTER TABLE meal_plans
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();
  `);
}

export async function down() {
  await db.execute(sql`
    ALTER TABLE meal_plans
    DROP COLUMN created_at;
  `);
} 