import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync, existsSync } from "node:fs";

const USERS_DIR = join(process.env.HOME || "/tmp", ".betty", "users");

// Ensure users directory exists
if (!existsSync(USERS_DIR)) {
  mkdirSync(USERS_DIR, { recursive: true });
}

function getFilePath(userId) {
  return join(USERS_DIR, `${userId}.json`);
}

function loadUser(userId) {
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("userId must be a non-empty string");
  }
  const filePath = getFilePath(userId);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function saveUser(user) {
  const filePath = getFilePath(user.id);
  try {
    writeFileSync(filePath, JSON.stringify(user, null, 2));
  } catch (err) {
    console.error(`[user-store] Failed to save user ${user.id}: ${err.message}`);
    throw err;
  }
}

function deleteUser(userId) {
  const filePath = getFilePath(userId);
  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath);
    } catch (err) {
      console.error(`[user-store] Failed to delete user ${userId}: ${err.message}`);
      return false;
    }
    return true;
  }
  return false;
}

function getUserByEmail(email) {
  if (!existsSync(USERS_DIR)) return null;
  const files = readdirSync(USERS_DIR).filter(f => f.endsWith(".json"));
  for (const file of files) {
    const user = loadUser(file.replace(".json", ""));
    if (user && user.email.toLowerCase() === email.toLowerCase()) {
      return user;
    }
  }
  return null;
}

function listUsers() {
  if (!existsSync(USERS_DIR)) return [];
  const files = readdirSync(USERS_DIR).filter(f => f.endsWith(".json"));
  const users = [];
  for (const file of files) {
    const user = loadUser(file.replace(".json", ""));
    if (user) {
      // Don't expose password hash in list
      const { passwordHash, ...publicUser } = user;
      users.push(publicUser);
    }
  }
  return users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function createUser({ email, passwordHash, name, role = "user" }) {
  const now = Date.now();
  const user = {
    id: randomUUID(),
    email: email.toLowerCase().trim(),
    passwordHash,
    name: name || email.split("@")[0],
    role,
    createdAt: now,
    lastLogin: null,
  };
  saveUser(user);
  return user;
}

function updateUser(userId, updates) {
  const user = loadUser(userId);
  if (!user) return null;
  // Whitelist allowed fields to prevent privilege escalation
  const allowedFields = ["email", "name", "lastLogin"];
  for (const key of allowedFields) {
    if (key in updates) {
      user[key] = updates[key];
    }
  }
  user.updatedAt = Date.now();
  saveUser(user);
  return user;
}

function hasUsers() {
  return listUsers().length > 0;
}

export {
  USERS_DIR,
  loadUser,
  saveUser,
  deleteUser,
  getUserByEmail,
  listUsers,
  createUser,
  updateUser,
  hasUsers,
};
