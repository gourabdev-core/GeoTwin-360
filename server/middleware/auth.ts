import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { User } from '@supabase/supabase-js';

// Extend Express Request to optionally hold authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Optional Auth Middleware:
 * Inspects Authorization header, populates req.user if a valid Supabase JWT is provided.
 * Does not block unauthenticated requests.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      req.user = user;
    }
  } catch (err) {
    console.warn('[Server Auth Middleware] Token verification failed:', err);
  }

  next();
}

/**
 * Required Auth Middleware:
 * Rejects requests that lack a valid Supabase JWT.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Authentication token is missing or malformed.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Authentication token is empty.',
    });
    return;
  }

  // In test environment, allow simulated test tokens to verify multi-tenant isolation
  if (process.env.NODE_ENV === 'test' && token.startsWith('test-token-')) {
    const testUserId = token.replace('test-token-', '');
    req.user = {
      id: testUserId,
      email: `${testUserId}@example.test`,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    } as any;
    return next();
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({
        status: 'error',
        code: 'INVALID_TOKEN',
        message: 'Authentication token is invalid or expired.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      code: 'AUTH_VERIFICATION_ERROR',
      message: 'Failed to verify authentication credentials.',
    });
  }
}
