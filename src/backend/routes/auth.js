import { Router } from "express";
import { createUser, getUserByEmail, updateUser, hasUsers } from "../user-store.js";
import { hashPassword, verifyPassword, generateTokens } from "../auth-utils.js";

const router = Router();

// ─── Rate Limiting (simple in-memory) ───────────────────────────────────────

const rateLimits = new Map();

function checkRateLimit(key, maxAttempts, windowMs) {
  const now = Date.now();
  const window = rateLimits.get(key) || [];
  // Clean old entries
  const recent = window.filter(t => now - t < windowMs);
  rateLimits.set(key, recent);

  if (recent.length >= maxAttempts) {
    return false; // Rate limited
  }
  recent.push(now);
  rateLimits.set(key, recent);
  return true;
}

// ─── POST /api/auth/register ───────────────────────────────────────────────

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (name && name.length > 100) {
      return res.status(400).json({ error: "Name must be 100 characters or less" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Rate limit: 3 attempts per minute
    const rateKey = `register:${req.ip}`;
    if (!checkRateLimit(rateKey, 3, 60_000)) {
      return res.status(429).json({ error: "Too many registration attempts. Try again later." });
    }

    // Check if user already exists
    const existing = getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const isFirstUser = !existing && (await import("../user-store.js")).hasUsers() === false;
    const user = createUser({
      email,
      passwordHash,
      name: name || email.split("@")[0],
      role: isFirstUser ? "admin" : "user",
    });

    // Generate tokens
    const tokens = generateTokens(user);

    // Set httpOnly cookies
    res.cookie("access_token", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24h
    });

    res.cookie("refresh_token", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
    });

    // Update last login
    updateUser(user.id, { lastLogin: Date.now() });

    // Return user (without password) and token expiry
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({
      user: safeUser,
      expiresIn: tokens.expiresIn,
      message: isFirstUser ? "Admin account created. You can manage other users from the admin panel." : "Account created successfully.",
    });
  } catch (err) {
    console.error("[auth] Registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Rate limit: 10 attempts per minute
    const rateKey = `login:${req.ip}`;
    if (!checkRateLimit(rateKey, 10, 60_000)) {
      return res.status(429).json({ error: "Too many login attempts. Try again later." });
    }

    // Find user
    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Set httpOnly cookies
    res.cookie("access_token", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie("refresh_token", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Update last login
    updateUser(user.id, { lastLogin: Date.now() });

    // Return user and token expiry
    const { passwordHash: _, ...safeUser } = user;
    res.json({
      user: safeUser,
      expiresIn: tokens.expiresIn,
    });
  } catch (err) {
    console.error("[auth] Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────

router.post("/logout", (req, res) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  res.json({ message: "Logged out successfully" });
});

// ─── POST /api/auth/refresh ────────────────────────────────────────────────

router.post("/refresh", (req, res) => {
  const refreshToken = req.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token required" });
  }

  // Import refresh function
  const { refreshAccessToken } = require("../auth-utils.js");
  const newAccessToken = refreshAccessToken(refreshToken);

  if (!newAccessToken) {
    // Invalid refresh token — clear all cookies
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  res.cookie("access_token", newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.json({ expiresIn: "24h" });
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────

router.get("/me", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ user: req.user });
});

// ─── GET /api/auth/status ──────────────────────────────────────────────────

router.get("/status", (req, res) => {
  // Public endpoint — tells frontend whether auth is enabled and if users exist
  const authEnabled = process.env.AUTH_ENABLED !== "false";
  res.json({
    authEnabled,
    hasUsers: hasUsers(),
    isAuthenticated: !!req.user,
  });
});

export default router;
