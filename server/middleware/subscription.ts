import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.id) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  try {
    const [user] = await db
      .select({
        subscriptionStatus: users.subscriptionStatus,
        subscriptionTier: users.subscriptionTier,
        subscriptionEndDate: users.subscriptionEndDate,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.subscriptionStatus !== 'active' || user.subscriptionTier !== 'premium') {
      return res.status(403).json({
        error: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'This feature requires an active premium subscription'
      });
    }

    // Check if subscription has expired
    if (user.subscriptionEndDate && new Date() > user.subscriptionEndDate) {
      return res.status(403).json({
        error: 'Subscription expired',
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Your subscription has expired. Please renew to continue using this feature'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
}
