import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const BCRYPT_COST = 12;

// JWT secrets — use env vars or generate deterministic defaults
const JWT_SECRET = process.env.JWT_SECRET || "betty-jwt-secret-change-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "betty-refresh-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * Hash a password using bcrypt.
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Verify a password against a bcrypt hash.
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate access and refresh tokens for a user.
 * Returns { accessToken, refreshToken, expiresIn }.
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, type: "refresh" },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken, expiresIn: JWT_EXPIRES_IN };
}

/**
 * Verify and decode an access token.
 * Returns the decoded payload or null if invalid/expired.
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Verify and decode a refresh token.
 * Returns the decoded payload or null if invalid/expired.
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    // Only allow refresh tokens
    if (decoded.type !== "refresh") return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Refresh an access token using a valid refresh token.
 * Returns a new accessToken or null.
 */
function refreshAccessToken(refreshToken) {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) return null;
  return jwt.sign(
    { userId: decoded.userId, type: "refreshed" },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  refreshAccessToken,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
};
