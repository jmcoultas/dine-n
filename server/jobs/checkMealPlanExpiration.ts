import { MealPlanExpirationService } from "../services/mealPlanExpiration";

export async function checkMealPlanExpiration() {
  try {
    await MealPlanExpirationService.markExpiredPlans();
    console.log("Successfully checked and updated expired meal plans");
  } catch (error) {
    console.error("Error checking meal plan expiration:", error);
  }
}

// Run the job every hour
export function startExpirationJob() {
  // Initial check
  checkMealPlanExpiration();

  // Schedule periodic checks
  setInterval(checkMealPlanExpiration, 60 * 60 * 1000); // Every hour
} 