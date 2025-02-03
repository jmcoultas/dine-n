import { Router } from 'express';
import { db } from '../../db';
import { mealPlans, mealPlanRecipes } from '@db/schema';
import { eq } from 'drizzle-orm';
import { withAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';

const router = Router();

// Get user's meal plans
router.get('/', withAuth(async (req: AuthenticatedRequest, res) => {
  try {
    const userMealPlans = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.user_id, req.user.id));
    res.json(userMealPlans);
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
}));

// Get specific meal plan with recipes
router.get('/:id', withAuth(async (req: AuthenticatedRequest, res) => {
  try {
    const [mealPlan] = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.id, parseInt(req.params.id)))
      .limit(1);

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    const mealPlanRecipesList = await db
      .select()
      .from(mealPlanRecipes)
      .where(eq(mealPlanRecipes.meal_plan_id, mealPlan.id));

    res.json({ ...mealPlan, recipes: mealPlanRecipesList });
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    res.status(500).json({ error: 'Failed to fetch meal plan' });
  }
}));

export default router; 