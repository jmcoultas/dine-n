
import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL;

export default defineConfig({
  out: "./migrations",
  schema: "./db/schema.ts",
  driver: "pg",
  dbCredentials: {
    connectionString: dbUrl,
  },
  verbose: true,
  strict: true,
});
