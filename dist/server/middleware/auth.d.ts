/**
 * JWT authentication middleware.
 */
import type { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    userId?: string;
}
/** Verify and decode a Bearer token, attaching user info to req */
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): void;
/** Require authentication — returns 401 if not authenticated */
export declare function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void;
/** Generate a JWT for the given user */
export declare function generateToken(userId: string): string;
