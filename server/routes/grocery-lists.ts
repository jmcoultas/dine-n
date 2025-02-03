import { Router } from 'express';
import { db } from '../../db';
import { groceryLists } from '@db/schema';
import { eq } from 'drizzle-orm';
import { withAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';

const router = Router();

// Get user's grocery lists
router.get('/', withAuth(async (req: AuthenticatedRequest, res) => {
  try {
    const userGroceryLists = await db
      .select()
      .from(groceryLists)
      .where(eq(groceryLists.user_id, req.user.id));
    res.json(userGroceryLists);
  } catch (error) {
    console.error('Error fetching grocery lists:', error);
    res.status(500).json({ error: 'Failed to fetch grocery lists' });
  }
}));

// Get specific grocery list
router.get('/:id', withAuth(async (req: AuthenticatedRequest, res) => {
  try {
    const [groceryList] = await db
      .select()
      .from(groceryLists)
      .where(eq(groceryLists.id, parseInt(req.params.id)))
      .limit(1);

    if (!groceryList) {
      return res.status(404).json({ error: 'Grocery list not found' });
    }

    res.json(groceryList);
  } catch (error) {
    console.error('Error fetching grocery list:', error);
    res.status(500).json({ error: 'Failed to fetch grocery list' });
  }
}));

export default router; 