import { Request, Response, NextFunction } from 'express';
import { auth } from '../utils/firebase-admin';
import { db } from '../../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { AuthenticatedRequest, User } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      firebaseUser?: any;
    }
  }
}

export async function verifyAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    req.firebaseUser = decodedToken;

    // Get or create user in our database
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.firebase_uid, decodedToken.uid))
      .limit(1);

    if (!user) {
      // Create new user if they don't exist
      const [newUser] = await db
        .insert(users)
        .values({
          email: decodedToken.email!,
          name: decodedToken.name || decodedToken.email!.split('@')[0],
          firebase_uid: decodedToken.uid,
          subscription_status: 'inactive' as const,
          subscription_tier: 'free' as const,
          meal_plans_generated: 0
        })
        .returning();
      user = newUser;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.user) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
}

// Type guard middleware for routes that need full request type safety
export function withAuth(
  handler: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void> | void
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    return handler(req as AuthenticatedRequest, res, next);
  };
} 