import db from "../db/db.js";
import crypto from "crypto";

/**
 * User schema (database):
 * {
 *   id: string (UUID)
 *   username: string
 *   passwordHash: string (bcrypt)
 *   role: 'admin' | 'operator' | 'viewer'
 *   createdAt: string (ISO)
 *   updatedAt: string (ISO)
 * }
 */

/**
 * Load all users from the database.
 * @returns {Array} Array of user objects
 */
async function loadUsers() {
  try {
    const users = await db.jsonAll(
      "SELECT id, username, password_hash AS passwordHash, role, created_at AS createdAt, updated_at AS updatedAt FROM users ORDER BY username"
    );
    return users || [];
  } catch (err) {
    console.error(`[auth] Failed to load users: ${err.message}`);
    return [];
  }
}

/**
 * Save all users to the database.
 * @param {Array} users - Array of user objects
 */
async function saveUsers(users) {
  try {
    // Use REPLACE INTO for each user (upsert)
    for (const user of users) {
      await db.run(
        `REPLACE INTO users (id, username, password_hash, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.username,
          user.passwordHash,
          user.role || "viewer",
          user.createdAt,
          user.updatedAt,
        ]
      );
    }
  } catch (err) {
    console.error(`[auth] Failed to save users: ${err.message}`);
    throw err;
  }
}

/**
 * Ensure the database is initialized and users table exists.
 */
async function ensureUsersFile() {
  await db.init();
}

/**
 * Find a user by username.
 * @param {string} username
 * @returns {object|null} User object or null
 */
async function findUser(username) {
  await ensureUsersFile();
  const user = await db.jsonGet(
    "SELECT id, username, password_hash AS passwordHash, role, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE username = ?",
    [username]
  );
  return user || null;
}

/**
 * Find a user by id.
 * @param {string} id
 * @returns {object|null} User object or null
 */
async function findUserById(id) {
  await ensureUsersFile();
  const user = await db.jsonGet(
    "SELECT id, username, password_hash AS passwordHash, role, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE id = ?",
    [id]
  );
  return user || null;
}

/**
 * Add a new user.
 * @param {object} user - User object (without id/createdAt/updatedAt — these are auto-generated)
 * @returns {object} The created user
 */
async function addUser(user) {
  await ensureUsersFile();
  const now = new Date().toISOString();
  const newUser = {
    id: crypto.randomUUID(),
    username: user.username,
    passwordHash: user.passwordHash,
    role: user.role || "viewer",
    createdAt: now,
    updatedAt: now,
  };
  await db.run(
    "INSERT INTO users (id, username, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [newUser.id, newUser.username, newUser.passwordHash, newUser.role, newUser.createdAt, newUser.updatedAt]
  );
  return newUser;
}

/**
 * Update a user by username.
 * @param {string} username
 * @param {object} updates - Fields to update (passwordHash, role, etc.)
 * @returns {object|null} Updated user or null
 */
async function updateUser(username, updates) {
  await ensureUsersFile();
  const now = new Date().toISOString();
  const setClauses = [];
  const params = [];

  if (updates.passwordHash !== undefined) {
    setClauses.push("password_hash = ?");
    params.push(updates.passwordHash);
  }
  if (updates.role !== undefined) {
    setClauses.push("role = ?");
    params.push(updates.role);
  }

  if (setClauses.length === 0) {
    // Find user to return current state
    return await findUser(username);
  }

  setClauses.push("updated_at = ?");
  params.push(now);
  params.push(username);

  await db.run(`UPDATE users SET ${setClauses.join(", ")} WHERE username = ?`, params);

  return await findUser(username);
}

/**
 * Delete a user by username.
 * @param {string} username
 * @returns {boolean} True if deleted, false if not found
 */
async function deleteUser(username) {
  await ensureUsersFile();
  const result = await db.run("DELETE FROM users WHERE username = ?", [username]);
  return result.affectedRows > 0;
}

/**
 * List all users (without password hashes).
 * @returns {Array} Array of sanitized user objects
 */
async function listUsers() {
  await ensureUsersFile();
  const users = await db.jsonAll(
    "SELECT id, username, role, created_at AS createdAt, updated_at AS updatedAt FROM users ORDER BY username"
  );
  return users || [];
}

/**
 * Check if any users exist.
 * @returns {boolean}
 */
async function hasUsers() {
  await ensureUsersFile();
  const result = await db.get("SELECT COUNT(*) as count FROM users");
  return (result?.count || 0) > 0;
}

/**
 * Get the number of users.
 * @returns {number}
 */
async function getUserCount() {
  await ensureUsersFile();
  const result = await db.get("SELECT COUNT(*) as count FROM users");
  return result?.count || 0;
}

export {
  ensureUsersFile,
  loadUsers,
  saveUsers,
  findUser,
  findUserById,
  addUser,
  updateUser,
  deleteUser,
  listUsers,
  hasUsers,
  getUserCount,
};
