import jwt from "jsonwebtoken";

/**
 * JWT authentication middleware.
 * Checks Authorization header (Bearer token) or query param (for SSE).
 * Attaches `req.user` with { id, username, role } on success.
 */
function authenticate(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("[auth] JWT_SECRET not configured. Authentication cannot function.");
    return res.status(500).json({ success: false, error: "Authentication misconfigured" });
  }

  // Try Authorization header first
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  // Fall back to query param (for SSE connections)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, error: "Token expired" });
    }
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
}

/**
 * Role-based authorization middleware factory.
 * Usage: authorize('admin', 'operator')
 * At least one of the specified roles must match.
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required: ${allowedRoles.join(" or ")}`,
      });
    }

    next();
  };
}

/**
 * Optional authentication middleware.
 * Attaches `req.user` if a valid token is present, but doesn't reject if missing.
 * Used for routes that work with or without auth (e.g., health check).
 */
function optionalAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    req.user = null;
    return next();
  }

  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
  } catch (err) {
    req.user = null;
  }

  next();
}

export { authenticate, authorize, optionalAuth };
