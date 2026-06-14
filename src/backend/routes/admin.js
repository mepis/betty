import { Router } from "express";
import { listUsers, deleteUser, loadUser, saveUser, createUser, getUserByEmail, hasUsers, updateUser } from "../user-store.js";
import { authorize } from "../auth-middleware.js";
import { hashPassword } from "../auth-utils.js";

const router = Router();

// All routes require admin role
router.use(authorize("admin"));

// ─── POST /api/admin/users ────────────────────────────────────────────────

router.post("/users", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Validate role
    const userRole = role && ["admin", "user"].includes(role) ? role : "user";

    // Check if user already exists
    const existing = getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const isFirstUser = !hasUsers();
    const user = createUser({
      email,
      passwordHash,
      name: name || email.split("@")[0],
      role: isFirstUser ? "admin" : userRole,
    });

    // Update last login
    updateUser(user.id, { lastLogin: Date.now() });

    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({ user: safeUser });
  } catch (err) {
    console.error("[admin] Failed to create user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────

router.get("/users", (req, res) => {
  try {
    const users = listUsers();
    res.json({ users });
  } catch (err) {
    console.error("[admin] Failed to list users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/users/:id ───────────────────────────────────────────

router.patch("/users/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = loadUser(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent admins from demoting themselves
    if (id === req.user.id && role !== "admin") {
      return res.status(403).json({ error: "Cannot demote yourself" });
    }

    // Validate role
    if (role && !["admin", "user"].includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be 'admin' or 'user'" });
    }

    if (role) {
      user.role = role;
    }
    user.updatedAt = Date.now();
    saveUser(user);

    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    console.error("[admin] Failed to update user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/admin/users/:id ──────────────────────────────────────────

router.delete("/users/:id", (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(403).json({ error: "Cannot delete your own account" });
    }

    const user = loadUser(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    deleteUser(id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("[admin] Failed to delete user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
