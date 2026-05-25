import jwt from "jsonwebtoken";
import crypto from "crypto";
import { SessionRepo } from "../db/repositories.js";

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

/**
 * Parse JWT_EXPIRES_IN string to milliseconds
 * Supports formats: "24h", "7d", "30m", "1h30m", or numeric (seconds)
 */
export function parseExpiresInMs(expiresIn) {
  if (typeof expiresIn === "number") return expiresIn * 1000; // seconds to ms
  if (typeof expiresIn !== "string") return 24 * 60 * 60 * 1000; // fallback 24h

  const match = expiresIn.match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match) return 24 * 60 * 60 * 1000; // fallback 24h

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return amount * (multipliers[unit] || 24 * 60 * 60 * 1000);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role_id: user.role_id,
      role_name: user.role_name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN, algorithm: "HS256" }
  );
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}

/**
 * Hash a token for storage in the database
 */
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Create an auth session for a user
 */
export async function createSession(user) {
  const token = generateToken(user);
  const tokenHash = hashToken(token);
  const expiresInMs = parseExpiresInMs(JWT_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + expiresInMs).toISOString();

  SessionRepo.create(user.id, tokenHash, expiresAt);

  return token;
}

/**
 * Validate a token against the sessions table
 * Returns user data if valid, null otherwise
 */
export function validateToken(token) {
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const tokenHash = hashToken(token);
  const session = SessionRepo.findByTokenHash(tokenHash);
  if (!session) return null;

  return {
    id: session.user_id,
    username: session.username,
    email: session.email,
    role_id: session.role_id,
    role_name: session.role_name,
  };
}

/**
 * Revoke a session by token
 */
export function revokeSession(token) {
  const tokenHash = hashToken(token);
  const session = SessionRepo.findByTokenHash(tokenHash);
  if (session) {
    SessionRepo.deleteById(session.id);
    return true;
  }
  return false;
}

/**
 * Revoke all sessions for a user
 */
export function revokeAllUserSessions(userId) {
  SessionRepo.deleteByUserId(userId);
}
