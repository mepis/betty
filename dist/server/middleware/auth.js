/**
 * JWT authentication middleware.
 */
import jwt from 'jsonwebtoken';
const rawSecret = process.env.JWT_SECRET;
const JWT_SECRET = typeof rawSecret === 'string' && rawSecret.length > 0 ? rawSecret : 'dev-secret-change-in-production';
/** Verify and decode a Bearer token, attaching user info to req */
export function authenticate(req, res, next) {
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
        const verifyFn = jwt.verify.bind(jwt);
        const decoded = verifyFn(token, JWT_SECRET);
        if (typeof decoded === 'object' && decoded !== null) {
            const payload = decoded;
            req.userId = payload.userId;
        }
        next();
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
}
/** Require authentication — returns 401 if not authenticated */
export function requireAuth(req, _res, next) {
    if (!req.userId) {
        _res.status(401).json({ error: 'Authentication required' });
        return;
    }
    next();
}
/** Generate a JWT for the given user */
export function generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}
//# sourceMappingURL=auth.js.map