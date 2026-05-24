import { validateToken } from "./jwt.js";
import { PermissionRepo, RoleRepo } from "../db/repositories.js";

/**
 * Validate WebSocket connection token from query parameters
 * @param {string} token - JWT token from query string
 * @returns {object|null} User data or null
 */
export function validateWsToken(token) {
  if (!token) return null;
  return validateToken(token);
}

/**
 * Check if a WebSocket user has a specific permission
 * @param {object} user - User object from token
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 * @returns {boolean}
 */
export function checkWsPermission(user, resource, action) {
  if (!user) return false;

  // Super admin bypasses all checks
  const role = RoleRepo.findById(user.role_id);
  if (role?.name === "super_admin") return true;

  return PermissionRepo.hasPermission(user.role_id, resource, action);
}

/**
 * Extract token from WebSocket upgrade request
 * Checks query params first, then Authorization header
 */
export function extractWsToken(request) {
  // Check query parameters (?token=...)
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const token = url.searchParams.get("token");
  if (token) return token;

  // Check Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}
