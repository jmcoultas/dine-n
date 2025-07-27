import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@db/schema";
import { sql } from "drizzle-orm";
import { config } from "../server/config/environment";

if (!config.databaseUrl) {
  throw new Error(
    "Database URL must be set. Did you forget to provision a database?",
  );
}

// Initialize database connection with proper configuration
const db = drizzle({
  connection: config.databaseUrl,
  schema,
  ws: ws,
});

// Export the database instance
export { db };

// Export a function to test the database connection
export async function testConnection() {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}