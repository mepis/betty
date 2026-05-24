import { Router } from "express";
import { UserRepo, RoleRepo } from "../db/repositories.js";
import { hashPassword, comparePassword } from "../auth/password.js";
import { createSession, revokeSession } from "../auth/jwt.js";
import { authMiddleware } from "../auth/middleware.js";

const router = Router();

// Register a new user
router.post("/register", async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: "Username must be 3-30 characters" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check for existing user
    const existingUser = UserRepo.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const existingEmail = UserRepo.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Create user with default "user" role
    const passwordHash = await hashPassword(password);
    const user = UserRepo.create(username, email, passwordHash);

    // Generate token
    const token = await createSession(user);

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role_name,
      },
    });
  } catch (err) {
    console.error("[auth] Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = UserRepo.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = await createSession(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role_name,
      },
    });
  } catch (err) {
    console.error("[auth] Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Get current user info
router.get("/me", authMiddleware, (req, res) => {
  const user = UserRepo.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role_name,
    role_id: user.role_id,
    created_at: user.created_at,
  });
});

// Logout (revoke current session)
router.post("/logout", authMiddleware, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.slice(7);

  if (token) {
    revokeSession(token);
  }

  res.json({ message: "Logged out" });
});

export default router;
