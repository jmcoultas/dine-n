
import { db } from "../../db";
import { temporaryRecipes } from "../../db/schema";
import { and, eq, lt } from "drizzle-orm";

export async function cleanupExpiredRecipes() {
  const now = new Date();
  
  try {
    const deletedRecipes = await db
      .delete(temporaryRecipes)
      .where(
        and(
          eq(temporaryRecipes.favorited, false),
          lt(temporaryRecipes.expires_at, now)
        )
      )
      .returning();
    
    console.log(`Cleaned up ${deletedRecipes.length} expired recipes`);
    return deletedRecipes;
  } catch (error) {
    console.error("Error cleaning up expired recipes:", error);
    throw error;
  }
}
