
import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL environment variable is required. Please ensure the database is provisioned.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./db/schema.ts",
  driver: 'pg',
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: dbUrl,
  },
});
