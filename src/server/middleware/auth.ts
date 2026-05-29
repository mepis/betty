/**
 * JWT authentication middleware.
 */

import jwt, { Secret } from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
}

const rawSecret: unknown = process.env.JWT_SECRET;
const JWT_SECRET: string = typeof rawSecret === 'string' && rawSecret.length > 0 ? rawSecret : 'dev-secret-change-in-production';

interface JwtPayload {
  userId: string;
  iat?: number;
}

/** Verify and decode a Bearer token, attaching user info to req */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header) {
    return next(); // Allow unauthenticated routes (register/login are public)
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
    return;
  }

  try {
     
    const verifyFn: (tok: string, sec: Secret | Buffer) => any = jwt.verify.bind(jwt);
    const decoded: any = verifyFn(token, JWT_SECRET as unknown as Secret);
    if (typeof decoded === 'object' && decoded !== null) {
      const payload = decoded as JwtPayload & Record<string, unknown>;
      req.userId = payload.userId;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
}

/** Require authentication — returns 401 if not authenticated */
export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (!req.userId) {
    _res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

/** Generate a JWT for the given user */
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET as unknown as Secret, { expiresIn: '7d' as const });
}
