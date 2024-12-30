import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@db/schema";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Initialize database connection with proper configuration
const db = drizzle({
  connection: process.env.DATABASE_URL,
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