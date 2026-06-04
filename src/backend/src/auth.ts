import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.SHARED_SECRET;
  if (!secret) {
    // No secret configured, allow all requests (development mode)
    return next();
  }

  // Check X-Shared-Secret header (primary)
  const headerSecret = req.headers['x-shared-secret'];
  // Check Authorization: Bearer header (alternative)
  const authHeader = req.headers['authorization'];

  const providedSecret =
    typeof headerSecret === 'string'
      ? headerSecret
      : authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

  if (!providedSecret || providedSecret !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
