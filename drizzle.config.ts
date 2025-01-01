
import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./migrations",
  dbCredentials: {
    connectionString: dbUrl!,
  },
  driver: 'pg',
  strict: true,
  verbose: true,
});
