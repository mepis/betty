import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash a password
 */
export async function hashPassword(password) {
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a password against a hash
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}
