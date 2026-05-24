import { Router } from "express";
import { UserRepo, RoleRepo } from "../db/repositories.js";
import { hashPassword } from "../auth/password.js";
import { authMiddleware, requirePermission, requireAdmin } from "../auth/middleware.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// List all users (requires users:read)
router.get("/", requirePermission("users", "read"), (req, res) => {
  const users = UserRepo.findAll();
  res.json(users);
});

// Get a single user
router.get("/:id", requirePermission("users", "read"), (req, res) => {
  const user = UserRepo.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
});

// Create a new user (admin only)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role_id } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    // Validate role
    if (role_id) {
      const role = RoleRepo.findById(role_id);
      if (!role) {
        return res.status(400).json({ error: "Invalid role_id" });
      }
    }

    // Check for existing user
    if (UserRepo.findByUsername(username)) {
      return res.status(409).json({ error: "Username already taken" });
    }
    if (UserRepo.findByEmail(email)) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);
    const user = UserRepo.create(username, email, passwordHash, role_id);

    res.status(201).json({
      message: "User created",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role_name,
        role_id: user.role_id,
      },
    });
  } catch (err) {
    console.error("[users] Create error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Update a user
router.put("/:id", requirePermission("users", "update"), async (req, res) => {
  try {
    const user = UserRepo.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updates = {};

    if (req.body.username) {
      // Check uniqueness
      const existing = UserRepo.findByUsername(req.body.username);
      if (existing && existing.id !== parseInt(req.params.id)) {
        return res.status(409).json({ error: "Username already taken" });
      }
      updates.username = req.body.username;
    }

    if (req.body.email) {
      const existing = UserRepo.findByEmail(req.body.email);
      if (existing && existing.id !== parseInt(req.params.id)) {
        return res.status(409).json({ error: "Email already registered" });
      }
      updates.email = req.body.email;
    }

    if (req.body.password) {
      updates.password_hash = await hashPassword(req.body.password);
    }

    if (req.body.role_id !== undefined) {
      const role = RoleRepo.findById(req.body.role_id);
      if (!role) {
        return res.status(400).json({ error: "Invalid role_id" });
      }
      updates.role_id = req.body.role_id;
    }

    const updated = UserRepo.update(req.params.id, updates);
    res.json({
      message: "User updated",
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role_name,
        role_id: updated.role_id,
      },
    });
  } catch (err) {
    console.error("[users] Update error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete a user
router.delete("/:id", requirePermission("users", "delete"), (req, res) => {
  // Prevent self-deletion
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(403).json({ error: "Cannot delete your own account" });
  }

  const user = UserRepo.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  UserRepo.delete(req.params.id);
  res.json({ message: "User deleted" });
});

export default router;
