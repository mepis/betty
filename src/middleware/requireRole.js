/**
 * Require Role Middleware Factory
 * Creates middleware that checks if user has a specific role
 *
 * @param {string} requiredRole - Role required to access route
 * @returns {Function} Middleware function
 */
function requireRole(requiredRole) {
  return function (req, res, next) {
    // User must be authenticated first
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          type: 'authentication_error',
          code: 'unauthorized',
        },
      });
    }

    // Check if user has required role
    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        error: {
          message: 'Insufficient permissions',
          type: 'permission_error',
          code: 'forbidden',
        },
      });
    }

    next();
  };
}

module.exports = requireRole;
