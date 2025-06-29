import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // First check if user is authenticated
  if (!req.user?.id) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      message: 'You must be logged in to access this resource'
    });
  }

  try {
    // Check if user has admin privileges
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        is_admin: users.is_admin,
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

    if (!user.is_admin) {
      console.log(`Non-admin user ${user.email} (ID: ${user.id}) attempted to access admin resource`);
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED',
        message: 'You do not have permission to access this resource'
      });
    }

    console.log(`Admin user ${user.email} (ID: ${user.id}) accessing admin resource`);
    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
}

// Middleware to check admin status without blocking (for conditional UI)
export async function checkAdminStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.id) {
    req.isAdmin = false;
    return next();
  }

  try {
    const [user] = await db
      .select({
        is_admin: users.is_admin,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    req.isAdmin = user?.is_admin || false;
    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    req.isAdmin = false;
    next();
  }
}

// Extend Express Request interface to include isAdmin
declare global {
  namespace Express {
    interface Request {
      isAdmin?: boolean;
    }
  }
} 