import { sql } from "drizzle-orm";

export const up = sql`
  ALTER TABLE users
  ADD COLUMN ingredient_recipes_generated INTEGER NOT NULL DEFAULT 0;
`;

export const down = sql`
  ALTER TABLE users
  DROP COLUMN ingredient_recipes_generated;
`; 