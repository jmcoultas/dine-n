import { db } from "../../db";
import { mealPlans, users } from "@db/schema";
import { and, eq, lt, isNull } from "drizzle-orm";

export class MealPlanExpirationService {
  // Check if a meal plan is expired
  static async isExpired(mealPlanId: number): Promise<boolean> {
    const plan = await db.query.mealPlans.findFirst({
      where: and(
        eq(mealPlans.id, mealPlanId),
        eq(isNull(mealPlans.expiration_date), false)
      ),
    });

    if (!plan) return false;
    return new Date() > plan.expiration_date!;
  }

  // Calculate expiration date based on user's subscription and days generated
  static calculateExpirationDate(startDate: Date, daysGenerated: number): Date {
    const expirationDate = new Date(startDate);
    expirationDate.setDate(expirationDate.getDate() + daysGenerated);
    return expirationDate;
  }

  // Get allowed days based on subscription tier
  static getAllowedDays(subscriptionTier: 'free' | 'premium'): number {
    return subscriptionTier === 'free' ? 2 : 7;
  }

  // Mark meal plans as expired
  static async markExpiredPlans(): Promise<void> {
    await db
      .update(mealPlans)
      .set({ is_expired: true })
      .where(
        and(
          lt(mealPlans.expiration_date, new Date()),
          eq(mealPlans.is_expired, false)
        )
      );
  }

  // Validate requested days against subscription tier
  static validateRequestedDays(days: number, subscriptionTier: 'free' | 'premium'): boolean {
    const maxDays = this.getAllowedDays(subscriptionTier);
    return days <= maxDays;
  }
} 