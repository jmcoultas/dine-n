import { sql } from "drizzle-orm";
import { pgTable, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "../index";

export async function up() {
  await db.execute(sql`
    ALTER TABLE meal_plans
    ADD COLUMN expiration_date TIMESTAMP,
    ADD COLUMN days_generated INTEGER NOT NULL DEFAULT 2,
    ADD COLUMN is_expired BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  // Set expiration_date for existing meal plans
  await db.execute(sql`
    UPDATE meal_plans
    SET expiration_date = end_date,
        days_generated = EXTRACT(DAY FROM (end_date - start_date)) + 1
    WHERE expiration_date IS NULL;
  `);
}

export async function down() {
  await db.execute(sql`
    ALTER TABLE meal_plans
    DROP COLUMN expiration_date,
    DROP COLUMN days_generated,
    DROP COLUMN is_expired;
  `);
} 