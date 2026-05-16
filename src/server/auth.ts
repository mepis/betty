import jwt from "jsonwebtoken";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface JwtPayload {
  id: string;
  username: string;
  role: "admin" | "user" | "viewer";
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TOKEN_EXPIRY = "24h";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required. Generate one with:\n  node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");
  }
  return secret;
}

// ─── Token Functions ────────────────────────────────────────────────────────

/** Generate a JWT for the given user payload. */
export function generateToken(payload: JwtPayload): string {
  const secret = getSecret();
  return jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn: TOKEN_EXPIRY,
  });
}

/** Verify and decode a JWT. Returns payload or null if invalid/expired. */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const secret = getSecret();
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/** Get the token expiry timestamp (now + 24h). */
export function getTokenExpiry(): number {
  return Date.now() + 24 * 60 * 60 * 1000;
}
