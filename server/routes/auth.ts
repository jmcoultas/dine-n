import { Router } from 'express';
import { verifyAuth } from '../middleware/auth';
import { db } from '../../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Sync user data from Firebase with our database
router.post('/auth/sync', verifyAuth, async (req, res) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.firebase_uid, req.firebaseUser.uid))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user data without sensitive fields
    const { password_hash, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/auth/profile', verifyAuth, async (req, res) => {
  try {
    const { name, preferences } = req.body;

    const [updatedUser] = await db
      .update(users)
      .set({
        name: name?.trim(),
        preferences,
      })
      .where(eq(users.id, req.user.id))
      .returning();

    const { password_hash, ...safeUser } = updatedUser;
    res.json(safeUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router; 