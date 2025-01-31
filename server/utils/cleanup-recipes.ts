
import { db } from "../../db";
import { temporaryRecipes } from "../../db/schema";
import { and, eq, lt } from "drizzle-orm";

async function cleanupExpiredRecipes() {
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
    
    console.log(`Successfully deleted ${deletedRecipes.length} expired recipes`);
    console.log('Deleted recipe IDs:', deletedRecipes.map(r => r.id).join(', '));
    
    return deletedRecipes;
  } catch (error) {
    console.error("Error during cleanup:", error);
    throw error;
  }
}

// Execute the cleanup
cleanupExpiredRecipes()
  .then(() => {
    console.log('Cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
