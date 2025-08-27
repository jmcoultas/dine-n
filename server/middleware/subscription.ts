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
        subscription_status: users.subscription_status,
        subscription_tier: users.subscription_tier,
        subscription_end_date: users.subscription_end_date,
        subscription_renewal_date: users.subscription_renewal_date,
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

    if (user.subscription_end_date && new Date() > user.subscription_end_date) {
      return res.status(403).json({
        error: 'Subscription expired',
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Your subscription has expired. Please renew to continue using this feature'
      });
    }

    const hasPremiumAccess = user.subscription_tier === 'premium' && 
      (user.subscription_status === 'active' || 
       (user.subscription_status === 'cancelled' && user.subscription_end_date && new Date() <= user.subscription_end_date));

    if (!hasPremiumAccess) {
      return res.status(403).json({
        error: 'Premium subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'This feature requires an active premium subscription'
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