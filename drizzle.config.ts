
import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./migrations",
  driver: "postgresql",
  dialect: "postgresql",
  dbCredentials: {
    connectionString: dbUrl,
  },
  verbose: true,
  strict: true,
});
