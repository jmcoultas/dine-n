import { Router } from 'express';
import { db } from '../../db';
import { recipes, userRecipes } from '@db/schema';
import { eq } from 'drizzle-orm';
import { withAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';

const router = Router();

// Get all recipes
router.get('/', async (req, res) => {
  try {
    const allRecipes = await db
      .select()
      .from(recipes)
      .limit(50);
    res.json(allRecipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Get user's saved recipes
router.get('/saved', withAuth(async (req: AuthenticatedRequest, res) => {
  try {
    const savedRecipes = await db
      .select()
      .from(userRecipes)
      .where(eq(userRecipes.user_id, req.user.id))
      .leftJoin(recipes, eq(recipes.id, userRecipes.recipe_id));
    res.json(savedRecipes);
  } catch (error) {
    console.error('Error fetching saved recipes:', error);
    res.status(500).json({ error: 'Failed to fetch saved recipes' });
  }
}));

export default router; 