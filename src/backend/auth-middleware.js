import { verifyAccessToken } from "./auth-utils.js";
import { loadUser } from "./user-store.js";

/**
 * Authentication middleware.
 * Validates the access token from either:
 *   1. Authorization: Bearer <token> header
 *   2. access_token cookie
 * Sets req.user if valid, otherwise calls next() without setting user.
 */
function authenticate(req, res, next) {
  // If auth is globally disabled, skip verification
  if (process.env.AUTH_ENABLED === "false") {
    return next();
  }

  let token = null;

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  // Check cookie (fallback)
  if (!token && req.cookies) {
    token = req.cookies["access_token"];
  }

  if (!token) {
    // Return 401 if this is an API or WebSocket request
    if (req.headers["x-request-type"] === "api" || req.headers["upgrade"] === "websocket") {
      return res.status(401).json({ error: "Authentication failed" });
    }
    // For HTML requests, don't block — let the frontend handle redirect
    return next();
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    if (req.headers["x-request-type"] === "api" || req.headers["upgrade"] === "websocket") {
      return res.status(401).json({ error: "Authentication failed" });
    }
    return next();
  }

  // Load full user object
  const user = loadUser(decoded.userId);
  if (!user) {
    if (req.headers["x-request-type"] === "api" || req.headers["upgrade"] === "websocket") {
      return res.status(401).json({ error: "Authentication failed" });
    }
    return next();
  }

  // Attach user to request (without passwordHash)
  const { passwordHash, ...safeUser } = user;
  req.user = safeUser;
  req.token = token;
  next();
}

/**
 * Require authentication — returns 401 if not authenticated.
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

/**
 * Role-based authorization factory.
 * Usage: authorize('admin') or authorize('admin', 'user')
 * If called with no arguments, allows all authenticated users.
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    // Empty role list means allow all authenticated users
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

export { authenticate, requireAuth, authorize };
