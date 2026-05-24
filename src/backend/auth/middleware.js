import { validateToken } from "./jwt.js";
import { PermissionRepo, RoleRepo } from "../db/repositories.js";

/**
 * HTTP auth middleware — extracts JWT from Authorization header
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.slice(7);
  const user = validateToken(token);

  if (!user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = user;
  next();
}

/**
 * Optional auth middleware — sets req.user if token is valid, but doesn't require it
 */
export function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const user = validateToken(token);
    if (user) {
      req.user = user;
    }
  }

  next();
}

/**
 * Permission check middleware
 * @param {string} resource - The resource being accessed
 * @param {string} action - The action being performed
 */
export function requirePermission(resource, action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if the user's role has the required permission
    const hasPerm = PermissionRepo.hasPermission(req.user.role_id, resource, action);

    // Super admin bypasses all checks
    const role = RoleRepo.findById(req.user.role_id);
    const isSuperAdmin = role?.name === "super_admin";

    if (!hasPerm && !isSuperAdmin) {
      return res.status(403).json({
        error: `Permission denied: requires ${resource}:${action}`,
      });
    }

    next();
  };
}

/**
 * Require specific role name
 */
export function requireRole(roleName) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const role = RoleRepo.findById(req.user.role_id);
    if (!role || role.name !== roleName) {
      return res.status(403).json({ error: `Requires ${roleName} role` });
    }

    next();
  };
}

/**
 * Require admin or super_admin role
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const role = RoleRepo.findById(req.user.role_id);
  const allowedRoles = ["super_admin", "admin"];

  if (!role || !allowedRoles.includes(role.name)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}
