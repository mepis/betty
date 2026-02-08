/**
 * Require Authentication Middleware
 * Ensures user is logged in before allowing access to route
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: {
        message: 'Authentication required',
        type: 'authentication_error',
        code: 'unauthorized',
      },
    });
  }

  next();
}

module.exports = requireAuth;
