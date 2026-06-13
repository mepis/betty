import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";

const BCRYPT_COST = 12;

// JWT secrets — reject startup if not set via environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("[auth] JWT_SECRET environment variable is required but not set.");
  console.error("[auth] Generate one with: openssl rand -hex 32");
  process.exit(1);
}

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_REFRESH_SECRET) {
  console.error("[auth] JWT_REFRESH_SECRET environment variable is required but not set.");
  console.error("[auth] Generate one with: openssl rand -hex 32");
  process.exit(1);
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * Hash a password using bcrypt.
 */
async function hashPassword(password) {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("Password must be a non-empty string");
  }
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Verify a password against a bcrypt hash.
 */
async function verifyPassword(password, hash) {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("Password must be a non-empty string");
  }
  if (typeof hash !== "string" || hash.length === 0) {
    throw new Error("Hash must be a non-empty string");
  }
  return bcrypt.compare(password, hash);
}

/**
 * Generate access and refresh tokens for a user.
 * Returns { accessToken, refreshToken, expiresIn }.
 */
function generateTokens(user) {
  if (!user || typeof user.id !== "string" || !user.id) {
    throw new Error("Invalid user: id is required");
  }
  if (typeof user.email !== "string" || !user.email) {
    throw new Error("Invalid user: email is required");
  }
  if (typeof user.role !== "string" || !user.role) {
    throw new Error("Invalid user: role is required");
  }

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
async function refreshAccessToken(refreshToken) {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) return null;
  // Load user to get email and role for the new token payload
  const { loadUser } = await import("./user-store.js");
  const user = loadUser(decoded.userId);
  if (!user) return null;
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
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
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
};
