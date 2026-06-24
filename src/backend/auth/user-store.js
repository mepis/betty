import fs from "fs";
import { join } from "path";
import os from "os";

const BETTY_DIR = join(os.homedir(), ".betty");
const USERS_FILE = join(BETTY_DIR, "users.json");

/**
 * User schema:
 * {
 *   id: string (UUID-like)
 *   username: string
 *   passwordHash: string (bcrypt)
 *   role: 'admin' | 'operator' | 'viewer'
 *   createdAt: string (ISO date)
 *   updatedAt: string (ISO date)
 * }
 */

/**
 * Internal: ensure the .betty directory exists.
 */
function ensureBettyDir() {
  if (!fs.existsSync(BETTY_DIR)) {
    fs.mkdirSync(BETTY_DIR, { recursive: true });
  }
}

/**
 * Internal: write users to file without checking existence (avoids infinite loop).
 */
function saveUsersUnchecked(users) {
  ensureBettyDir();
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error(`[auth] Failed to save users: ${err.message}`);
    throw err;
  }
}

/**
 * Ensure the users file exists, creating it if missing.
 */
function ensureUsersFile() {
  ensureBettyDir();
  if (!fs.existsSync(USERS_FILE)) {
    saveUsersUnchecked([]);
  }
}

/**
 * Load all users from the JSON file.
 * Caller MUST ensure the file exists first (call ensureUsersFile()).
 * @returns {Array} Array of user objects
 */
function loadUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`[auth] Failed to load users: ${err.message}`);
    return [];
  }
}

/**
 * Save all users to the JSON file.
 * @param {Array} users - Array of user objects
 */
function saveUsers(users) {
  saveUsersUnchecked(users);
}

/**
 * Find a user by username.
 * @param {string} username
 * @returns {object|null} User object or null
 */
function findUser(username) {
  ensureUsersFile();
  const users = loadUsers();
  return users.find((u) => u.username === username) || null;
}

/**
 * Find a user by id.
 * @param {string} id
 * @returns {object|null} User object or null
 */
function findUserById(id) {
  ensureUsersFile();
  const users = loadUsers();
  return users.find((u) => u.id === id) || null;
}

/**
 * Add a new user.
 * @param {object} user - User object (without id/createdAt/updatedAt — these are auto-generated)
 * @returns {object} The created user
 */
function addUser(user) {
  ensureUsersFile();
  const users = loadUsers();
  const now = new Date().toISOString();
  const newUser = {
    id: crypto.randomUUID(),
    username: user.username,
    passwordHash: user.passwordHash,
    role: user.role || "viewer",
    createdAt: now,
    updatedAt: now,
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
}

/**
 * Update a user by username.
 * @param {string} username
 * @param {object} updates - Fields to update (passwordHash, role, etc.)
 * @returns {object|null} Updated user or null
 */
function updateUser(username, updates) {
  ensureUsersFile();
  const users = loadUsers();
  const index = users.findIndex((u) => u.username === username);
  if (index === -1) return null;
  users[index] = {
    ...users[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveUsers(users);
  return users[index];
}

/**
 * Delete a user by username.
 * @param {string} username
 * @returns {boolean} True if deleted, false if not found
 */
function deleteUser(username) {
  ensureUsersFile();
  const users = loadUsers();
  const filtered = users.filter((u) => u.username !== username);
  if (filtered.length === users.length) return false;
  saveUsers(filtered);
  return true;
}

/**
 * List all users (without password hashes).
 * @returns {Array} Array of sanitized user objects
 */
function listUsers() {
  ensureUsersFile();
  const users = loadUsers();
  return users.map(({ id, username, role, createdAt, updatedAt }) => ({
    id,
    username,
    role,
    createdAt,
    updatedAt,
  }));
}

/**
 * Check if any users exist.
 * @returns {boolean}
 */
function hasUsers() {
  ensureUsersFile();
  return loadUsers().length > 0;
}

/**
 * Get the number of users.
 * @returns {number}
 */
function getUserCount() {
  ensureUsersFile();
  return loadUsers().length;
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
