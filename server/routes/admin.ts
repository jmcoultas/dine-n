import { Router } from 'express';
import { isAdmin } from '../auth';
import { db } from '../../db';
import { mealPlans, users, type User } from '@db/schema';
import { eq, and } from 'drizzle-orm';

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

// Admin endpoint to list users
router.get('/users', isAdmin, async (_req, res) => {
  try {
    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    res.json(usersList);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      error: 'Server Error', 
      message: 'Failed to fetch users' 
    });
  }
});

// Admin endpoint to toggle user admin status
router.post('/users/:id/toggle-admin', isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ 
        error: 'Invalid Request', 
        message: 'Invalid user ID' 
      });
    }

    // Don't allow admins to remove their own admin status
    if (userId === req.user?.id) {
      return res.status(400).json({
        error: 'Invalid Request',
        message: 'Cannot modify your own admin status'
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: 'User not found' 
      });
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        isAdmin: !user.isAdmin,
      })
      .where(eq(users.id, userId))
      .returning();

    res.json({
      message: `Admin status ${updatedUser.isAdmin ? 'granted' : 'revoked'} successfully`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        isAdmin: updatedUser.isAdmin,
      }
    });
  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).json({ 
      error: 'Server Error', 
      message: 'Failed to update admin status' 
    });
  }
});

export default router;