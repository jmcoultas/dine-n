import { Router } from 'express';
import { isAdmin } from '../auth';
import { db } from '../../db';
import { mealPlans } from '@db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Admin endpoint to override meal plan hold
router.post('/meal-plans/:id/override', isAdmin, async (req, res) => {
  try {
    const mealPlanId = parseInt(req.params.id);
    if (isNaN(mealPlanId)) {
      return res.status(400).json({ 
        error: 'Invalid Request', 
        message: 'Invalid meal plan ID' 
      });
    }

    // Get the meal plan
    const [mealPlan] = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.id, mealPlanId))
      .limit(1);

    if (!mealPlan) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: 'Meal plan not found' 
      });
    }

    // Update the meal plan dates to remove the hold
    const [updatedMealPlan] = await db
      .update(mealPlans)
      .set({
        startDate: new Date(), // Reset to current date
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Set to 7 days from now
      })
      .where(eq(mealPlans.id, mealPlanId))
      .returning();

    res.json({
      message: 'Meal plan hold override successful',
      mealPlan: updatedMealPlan,
    });
  } catch (error) {
    console.error('Error overriding meal plan:', error);
    res.status(500).json({ 
      error: 'Server Error', 
      message: 'Failed to override meal plan' 
    });
  }
});

export default router;
