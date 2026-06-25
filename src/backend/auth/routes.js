import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticate } from "./middleware.js";
import {
  findUser,
  findUserById,
  addUser,
  updateUser,
  deleteUser,
  listUsers,
  hasUsers,
  getUserCount,
} from "./user-store.js";

const router = express.Router();

// Read secret dynamically (set by api-server.js before routes are used)
function getSecret() {
  return process.env.JWT_SECRET;
}

function getExpiry() {
  return process.env.JWT_EXPIRES_IN || "24h";
}

/**
 * POST /api/auth/login
 * Authenticate a user and return a JWT token.
 */
router.post("/login", async (req, res) => {
  if (!getSecret()) {
    return res.status(500).json({ success: false, error: "Authentication misconfigured" });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and password required" });
  }

  const user = await findUser(username);
  if (!user) {
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    getSecret(),
    { expiresIn: getExpiry() }
  );

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    },
  });
});

/**
 * POST /api/auth/register
 * Register a new user. If no users exist, the first user becomes admin.
 */
router.post("/register", async (req, res) => {
  if (!getSecret()) {
    return res.status(500).json({ success: false, error: "Authentication misconfigured" });
  }

  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and password required" });
  }

  // Check if user already exists
  const existing = await findUser(username);
  if (existing) {
    return res.status(409).json({ success: false, error: "Username already exists" });
  }

  // Determine role: first user becomes admin, others default to viewer
  const userRole = (await getUserCount()) === 0 ? "admin" : (role || "viewer");

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await addUser({ username, passwordHash, role: userRole });

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    getSecret(),
    { expiresIn: getExpiry() }
  );

  res.status(201).json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    },
  });
});

/**
 * PUT /api/auth/password
 * Change the current user's password. Requires current password verification.
 */
router.put("/password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: "Current and new password required" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, error: "New password must be at least 8 characters" });
  }

  // Find the current user by id
  const user = await findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }

  // Verify current password
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ success: false, error: "Current password is incorrect" });
  }

  // Hash and save new password
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await updateUser(user.username, { passwordHash });

  if (!updated) {
    return res.status(500).json({ success: false, error: "Failed to update password" });
  }

  res.json({ success: true, message: "Password changed successfully" });
});

/**
 * GET /api/auth/me
 * Return the current authenticated user's info (no password hash).
 */
router.get("/me", authenticate, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  res.json({
    success: true,
    data: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    },
  });
});

/**
 * GET /api/auth/users
 * List all users (admin only).
 */
router.get("/users", authenticate, async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Admin access required" });
  }

  res.json({ success: true, data: await listUsers() });
});

/**
 * PUT /api/auth/users/:username
 * Update a user (admin only). Can update role, password, etc.
 */
router.put("/users/:username", authenticate, async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Admin access required" });
  }

  const { username } = req.params;
  const { role, password } = req.body;

  const updates = {};
  if (role) {
    if (!["admin", "operator", "viewer"].includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid role" });
    }
    updates.role = role;
  }

  if (password) {
    updates.passwordHash = await bcrypt.hash(password, 10);
  }

  const updated = await updateUser(username, updates);
  if (!updated) {
    return res.status(404).json({ success: false, error: "User not found" });
  }

  res.json({
    success: true,
    data: {
      id: updated.id,
      username: updated.username,
      role: updated.role,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  });
});

/**
 * DELETE /api/auth/users/:username
 * Delete a user (admin only). Cannot delete self.
 */
router.delete("/users/:username", authenticate, async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Admin access required" });
  }

  const { username } = req.params;

  // Prevent admin from deleting themselves
  if (username === req.user.username) {
    return res.status(400).json({ success: false, error: "Cannot delete your own account" });
  }

  const deleted = await deleteUser(username);
  if (!deleted) {
    return res.status(404).json({ success: false, error: "User not found" });
  }

  res.json({ success: true, message: `User "${username}" deleted` });
});

export { router as authRouter };
