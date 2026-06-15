import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import {
  SESSIONS_ENABLED,
  loadSession,
  saveSession,
  deleteSession,
  listSessions,
  createSession,
  updateSession,
} from "./session-store.js";
import { authenticate, requireAuth } from "./auth-middleware.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import { hasUsers } from "./user-store.js";
import { verifyRefreshToken, JWT_SECRET, JWT_REFRESH_SECRET } from "./auth-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const DEFAULT_WORKSPACE = process.env.WORKSPACE || resolve(__dirname, "../..");
const AUTH_ENABLED = process.env.AUTH_ENABLED !== "false";

console.log(`[server] Sessions ${SESSIONS_ENABLED ? "enabled" : "disabled"} (SESSIONS_ENABLED=${process.env.SESSIONS_ENABLED ?? "default:true"})`);

// ─── HTTP Server ────────────────────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);
app.use(express.json({ strict: false }));
app.use(cookieParser());

// Run auth middleware on every request so req.user is populated
app.use(authenticate);

// ─── Auth Pages & Routes (MUST be before static middleware) ────────────────

app.get("/login", (req, res) => {
  if (!AUTH_ENABLED) {
    return res.redirect("/");
  }
  // Check if already authenticated
  if (req.user) {
    return res.redirect("/");
  }
  res.send(LOGIN_PAGE_HTML);
});

app.get("/register", (req, res) => {
  if (!AUTH_ENABLED) {
    return res.redirect("/");
  }
  // Check if already authenticated
  if (req.user) {
    return res.redirect("/");
  }
  // Only allow registration if users exist (redirect to login) or no users (allow)
  res.send(REGISTER_PAGE_HTML);
});

// ─── Auth Routes ────────────────────────────────────────────────────────────

// Public status endpoint (must be before mounted auth routes)
app.get("/api/auth/status", (req, res) => {
  const authEnabled = process.env.AUTH_ENABLED !== "false";
  res.json({
    authEnabled,
    hasUsers: hasUsers(),
    isAuthenticated: !!req.user,
  });
});

// Debug: simple test route
console.log("[debug] Registering /api/test route, app._router.stack length:", app._router?.stack?.length || 0);
app.get("/api/test", (req, res) => {
  console.log("[debug] /api/test requested");
  res.json({ ok: true });
});

app.use("/api/auth", authenticate, authRoutes);

// Admin routes (user management — admin only)
app.use("/api/admin", authenticate, adminRoutes);

// Current user info
app.get("/api/me", (req, res) => {
  if (AUTH_ENABLED && !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (req.user) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});

// Auth configuration
const LOGIN_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Betty - Login</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d0d0d; color: #e5e5e5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .skip-link { position: absolute; top: -40px; left: 0; background: #6366f1; color: white; padding: 8px 16px; z-index: 100; font-size: 14px; text-decoration: none; border-radius: 0 0 4px 0; }
    .skip-link:focus { top: 0; }
    .login-container { width: 100%; max-width: 400px; padding: 20px; }
    .login-header { text-align: center; margin-bottom: 32px; }
    .login-header h1 { font-size: 28px; font-weight: 600; color: #e5e5e5; margin-bottom: 8px; }
    .login-header p { font-size: 14px; color: #888; }
    .login-form { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; font-weight: 500; color: #888; margin-bottom: 6px; }
    .form-group input { width: 100%; padding: 10px 14px; background: #0d0d0d; border: 1px solid #2a2a2a; border-radius: 8px; color: #e5e5e5; font-size: 14px; outline: none; transition: border-color 0.2s; }
    .form-group input:focus { border-color: #6366f1; }
    .form-group input::placeholder { color: #555; }
    .login-btn { width: 100%; padding: 12px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: opacity 0.2s; }
    .login-btn:hover { opacity: 0.9; }
    .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .error-msg { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; display: none; }
    .error-msg.show { display: block; }
    .register-link { text-align: center; margin-top: 16px; font-size: 13px; color: #888; }
    .register-link a { color: #6366f1; text-decoration: none; }
    .register-link a:hover { text-decoration: underline; }
    .first-user-notice { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); color: #a5b4fc; padding: 10px 14px; border-radius: 8px; font-size: 12px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>
  <div class="login-container" id="main">
    <div class="login-header">
      <h1>Betty</h1>
      <p>Sign in to access the coding agent</p>
    </div>
    <div id="notice" class="first-user-notice" style="display:none"></div>
    <div id="error" class="error-msg"></div>
    <form id="loginForm" class="login-form">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" placeholder="you@example.com" required autocomplete="email">
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" placeholder="Enter your password" required autocomplete="current-password">
      </div>
      <button type="submit" class="login-btn" id="submitBtn">Sign in</button>
    </form>
    <div class="register-link" id="registerLink" style="display:none">
      Don't have an account? <a href="/register">Create one</a>
    </div>
  </div>
  <script>
    const notice = document.getElementById('notice');
    const error = document.getElementById('error');
    const form = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');
    const registerLink = document.getElementById('registerLink');

    // Check if this is the first user (show register link)
    fetch('/api/auth/status')
      .then(r => {
        if (!r.ok) return null;
        return r.json();
      })
      .then(data => {
        if (!data) return;
        if (data.authEnabled && !data.hasUsers) {
          notice.style.display = 'block';
          notice.textContent = 'No accounts exist yet. You will create the admin account on the registration page.';
          registerLink.style.display = 'none';
        } else if (data.authEnabled && data.hasUsers) {
          registerLink.style.display = 'block';
        }
      }).catch(() => {});

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';
      error.classList.remove('show');

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include'
        });
        const data = await res.json();

        if (!res.ok) {
          error.textContent = data.error || 'Login failed';
          error.classList.add('show');
        } else {
          window.location.href = '/';
        }
      } catch (err) {
        error.textContent = 'Connection error. Please try again.';
        error.classList.add('show');
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
    });
  </script>
</body>
</html>`;

const REGISTER_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Betty - Register</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d0d0d; color: #e5e5e5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .skip-link { position: absolute; top: -40px; left: 0; background: #6366f1; color: white; padding: 8px 16px; z-index: 100; font-size: 14px; text-decoration: none; border-radius: 0 0 4px 0; }
    .skip-link:focus { top: 0; }
    .register-container { width: 100%; max-width: 400px; padding: 20px; }
    .register-header { text-align: center; margin-bottom: 32px; }
    .register-header h1 { font-size: 28px; font-weight: 600; color: #e5e5e5; margin-bottom: 8px; }
    .register-header p { font-size: 14px; color: #888; }
    .register-form { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; font-weight: 500; color: #888; margin-bottom: 6px; }
    .form-group input { width: 100%; padding: 10px 14px; background: #0d0d0d; border: 1px solid #2a2a2a; border-radius: 8px; color: #e5e5e5; font-size: 14px; outline: none; transition: border-color 0.2s; }
    .form-group input:focus { border-color: #6366f1; }
    .form-group input::placeholder { color: #555; }
    .register-btn { width: 100%; padding: 12px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: opacity 0.2s; }
    .register-btn:hover { opacity: 0.9; }
    .register-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .error-msg { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; display: none; }
    .error-msg.show { display: block; }
    .success-msg { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); color: #22c55e; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; display: none; }
    .success-msg.show { display: block; }
    .login-link { text-align: center; margin-top: 16px; font-size: 13px; color: #888; }
    .login-link a { color: #6366f1; text-decoration: none; }
    .login-link a:hover { text-decoration: underline; }
    .password-strength { height: 3px; border-radius: 2px; margin-top: 6px; transition: all 0.3s; }
    .strength-weak { background: #ef4444; width: 33%; }
    .strength-medium { background: #f59e0b; width: 66%; }
    .strength-strong { background: #22c55e; width: 100%; }
  </style>
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>
  <div class="register-container" id="main">
    <div class="register-header">
      <h1>Betty</h1>
      <p>Create your account</p>
    </div>
    <div id="error" class="error-msg"></div>
    <div id="success" class="success-msg"></div>
    <form id="registerForm" class="register-form">
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" placeholder="Your name" autocomplete="name">
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" placeholder="you@example.com" required autocomplete="email">
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" placeholder="At least 6 characters" required minlength="6" autocomplete="new-password">
        <div id="strengthBar" class="password-strength"></div>
      </div>
      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <input type="password" id="confirmPassword" placeholder="Repeat your password" required autocomplete="new-password">
      </div>
      <button type="submit" class="register-btn" id="submitBtn">Create account</button>
    </form>
    <div class="login-link">
      Already have an account? <a href="/login">Sign in</a>
    </div>
  </div>
  <script>
    const error = document.getElementById('error');
    const success = document.getElementById('success');
    const form = document.getElementById('registerForm');
    const submitBtn = document.getElementById('submitBtn');
    const strengthBar = document.getElementById('strengthBar');
    const passwordInput = document.getElementById('password');

    passwordInput.addEventListener('input', () => {
      const val = passwordInput.value;
      strengthBar.className = 'password-strength';
      if (val.length === 0) return;
      if (val.length < 8) strengthBar.classList.add('strength-weak');
      else if (val.length < 12) strengthBar.classList.add('strength-medium');
      else strengthBar.classList.add('strength-strong');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      // Client-side validation
      if (password !== confirmPassword) {
        error.textContent = 'Passwords do not match';
        error.classList.add('show');
        return;
      }
      if (password.length < 6) {
        error.textContent = 'Password must be at least 6 characters';
        error.classList.add('show');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';
      error.classList.remove('show');
      success.classList.remove('show');

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
          credentials: 'include'
        });
        const data = await res.json();

        if (!res.ok) {
          error.textContent = data.error || 'Registration failed';
          error.classList.add('show');
        } else {
          success.textContent = data.message || 'Account created! Redirecting...';
          success.classList.add('show');
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        }
      } catch (err) {
        error.textContent = 'Connection error. Please try again.';
        error.classList.add('show');
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    });
  </script>
</body>
</html>`;

// Serve Vue 3 frontend (built with Vite)
const { readFileSync, existsSync } = await import("node:fs");
const homeDir = process.env.HOME || "/home/" + (process.env.USER || "user");
const frontendDist = join(__dirname, "..", "frontend", "dist");

// Check if we have a built frontend or fall back to dev mode
const hasBuiltFrontend = existsSync(frontendDist);

function serveFrontend(req, res) {
  // Check if authenticated (or auth disabled)
  if (AUTH_ENABLED && !req.user) {
    return res.redirect("/login");
  }

  if (hasBuiltFrontend) {
    const frontendHtml = readFileSync(join(frontendDist, "index.html"), "utf8");
    const modified = frontendHtml.replace(
      '<head>',
      `<head><script>window.__ENV = { HOME: ${JSON.stringify(homeDir)}, AUTH_ENABLED: ${AUTH_ENABLED} };</script>`
    );
    return res.send(modified);
  } else {
    const fallbackHtml = readFileSync(join(__dirname, "..", "frontend", "public", "index.html"), "utf8");
    const modified = fallbackHtml.replace(
      '<head>',
      `<head><script>window.__ENV = { HOME: ${JSON.stringify(homeDir)}, AUTH_ENABLED: ${AUTH_ENABLED} };</script>`
    );
    return res.send(modified);
  }
}

if (hasBuiltFrontend) {
  app.get("/", authenticate, serveFrontend);
  app.use(express.static(frontendDist));
} else {
  app.get("/", authenticate, serveFrontend);
  app.use(express.static(join(__dirname, "..", "frontend", "public")));
}

// Workspace state
let currentWorkspace = DEFAULT_WORKSPACE;

// ─── Workspace API ──────────────────────────────────────────────────────────

async function listDirectory(dir) {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const result = {
    path: dir,
    directories: [],
    files: []
  };

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Count items inside the directory
      let itemCount = 0;
      try {
        const subEntries = await readdir(fullPath);
        itemCount = subEntries.length;
      } catch {
        itemCount = null;
      }
      result.directories.push({ name: entry.name, itemCount });
    } else if (entry.isFile()) {
      result.files.push(entry.name);
    }
  }

  // Sort: directories first, then files, both alphabetically
  result.directories.sort((a, b) => a.name.localeCompare(b.name));
  result.files.sort();

  return result;
}

// ─── Protected API Routes ───────────────────────────────────────────────────

function protectApi(req, res, next) {
  if (!AUTH_ENABLED) return next();
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

app.get("/api/workspace", protectApi, (req, res) => {
  res.json({ workspace: currentWorkspace });
});

app.post("/api/workspace", protectApi, async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({ error: "Path is required" });
    }

    // Validate path — reject traversal attempts
    if (path.includes("..")) {
      return res.status(400).json({ error: "Invalid path: traversal not allowed" });
    }
    // Resolve relative paths relative to HOME
    const resolved = !path.startsWith("/") ? join(process.env.HOME, path) : path;
    // Ensure resolved path is within HOME
    const homeDir = process.env.HOME || "/";
    if (resolved !== homeDir && !resolved.startsWith(homeDir + "/")) {
      return res.status(403).json({ error: "Path must be within home directory" });
    }

    // Check if directory exists
    const { stat } = await import("node:fs/promises");
    try {
      await stat(resolved);
    } catch {
      return res.status(404).json({ error: "Directory not found" });
    }

    currentWorkspace = resolved;
    console.log(`[workspace] Changed to: ${currentWorkspace}`);

    // Restart agent with new workspace
    try {
      await agent.restart();
      // Notify all clients
      for (const [id, client] of clients) {
        try {
          client.ws.send(JSON.stringify({ type: "agent_status", status: "running" }));
        } catch {}
      }
    } catch (err) {
      console.error(`[workspace] Failed to restart agent: ${err.message}`);
    }

    res.json({ workspace: currentWorkspace });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/directory", protectApi, async (req, res) => {
  try {
    let dir = req.query.path || currentWorkspace;
    // Validate path — reject traversal attempts
    if (req.query.path && req.query.path.includes("..")) {
      return res.status(400).json({ error: "Invalid path: traversal not allowed" });
    }
    // Resolve relative paths
    if (!dir.startsWith("/")) {
      dir = join(process.env.HOME || "/", dir);
    }
    // Ensure resolved path is within HOME
    const homeDir = process.env.HOME || "/";
    if (dir !== homeDir && !dir.startsWith(homeDir + "/")) {
      return res.status(403).json({ error: "Path must be within home directory" });
    }
    const result = await listDirectory(dir);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WebSocket Server ───────────────────────────────────────────────────────

function authenticateWs(req) {
  if (!AUTH_ENABLED) return true;

  // Check query string token (for WebSocket connections)
  const url = new URL(req.url, `http://${req.headers.host}`);
  const tokenFromQuery = url.searchParams.get("token");
  if (tokenFromQuery) {
    try {
      jwt.verify(tokenFromQuery, JWT_SECRET);
      return true;
    } catch {
      try {
        jwt.verify(tokenFromQuery, JWT_REFRESH_SECRET);
        return true;
      } catch {
        return false;
      }
    }
  }

  // Check cookie (httpOnly cookies are sent automatically)
  const cookieHeader = req.headers.cookie || '';
  const accessTokenMatch = cookieHeader.match(/access_token=([^;]+)/);
  if (accessTokenMatch) {
    try {
      jwt.verify(accessTokenMatch[1], JWT_SECRET);
      return true;
    } catch {
      // Try refresh token cookie as fallback
      const refreshTokenMatch = cookieHeader.match(/refresh_token=([^;]+)/);
      if (refreshTokenMatch) {
        try {
          jwt.verify(refreshTokenMatch[1], JWT_REFRESH_SECRET);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  return false;
}

const wss = new WebSocketServer({ 
  server: httpServer, 
  path: "/ws",
  verifyClient: (info, callback) => {
    const authenticated = authenticateWs(info.req);
    if (AUTH_ENABLED && !authenticated) {
      console.log("[ws] Rejected unauthenticated connection from", info.req.socket.remoteAddress);
      return callback(false, 401, "Unauthorized");
    }
    callback(true);
  }
});

// ─── RPC Agent Manager ──────────────────────────────────────────────────────

class RpcAgent {
  constructor() {
    this.proc = null;
    this.clientId = null;
    this.responseQueue = [];
    this.pendingRequests = new Map();
    this.isRunning = false;
    this.pendingStdout = "";
    this.listeners = new Map();
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
  }

  emit(event, ...args) {
    const fns = this.listeners.get(event) || [];
    for (const fn of fns) fn(...args);
  }

  async start() {
    // Build command args
    const args = ["--mode", "rpc", "--no-session"];

    // Check if we need to specify provider/model from settings
    const { spawnSync } = await import("node:child_process");
    const settingsResult = spawnSync("cat", [
      join(process.env.HOME, ".pi", "agent", "settings.json"),
    ], { encoding: "utf8" });

    let provider = null;
    let model = null;
    try {
      const settings = JSON.parse(settingsResult.stdout);
      if (settings.defaultProvider) provider = settings.defaultProvider;
      if (settings.defaultModel) model = settings.defaultModel;
    } catch {
      // Use defaults
    }

    if (provider) args.push("--provider", provider);
    if (model) args.push("--model", model);

    // Check for API key (skip for local providers like ollama)
    const keyEnv = this._getApiKeyForProvider(provider);
    if (keyEnv) {
      args.push("--api-key", keyEnv);
    }

    // Redact API key from log output
    const safeArgs = args.map((arg, i) => {
      if (i > 0 && args[i - 1] === "--api-key") return "***REDACTED***";
      return arg;
    });
    console.log(`[rpc] Starting pi with: pi ${safeArgs.join(" ")}`);
    console.log(`[rpc] Working directory: ${currentWorkspace}`);

    return new Promise((resolve, reject) => {
      this.proc = spawn("pi", args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
        cwd: currentWorkspace,
      });

      this.proc.stdout.on("data", (data) => this._handleStdout(data));
      this.proc.stderr.on("data", (data) => {
        const msg = data.toString();
        this.emit("stderr", msg);
        console.error(`[rpc stderr]`, msg.trim());
      });

      this.proc.on("exit", (code, signal) => {
        console.log(`[rpc] Exited with code ${code}, signal ${signal}`);
        this.isRunning = false;
        this.emit("exit", code, signal);
      });

      const startupTimeout = setTimeout(() => {
        resolve();
      }, 3000);

      this.proc.on("error", (err) => {
        clearTimeout(startupTimeout);
        console.error(`[rpc] Error: ${err.message}`);
        this.emit("error", err);
        reject(err);
      });
    });
  }

  _getApiKeyForProvider(provider) {
    if (!provider) return null;
    const envMap = {
      anthropic: "ANTHROPIC_API_KEY",
      openai: "OPENAI_API_KEY",
      google: "GOOGLE_API_KEY",
      deepseek: "DEEPSEEK_API_KEY",
      xai: "XAI_API_KEY",
      groq: "GROQ_API_KEY",
      cerebras: "CEREBRAS_API_KEY",
      openrouter: "OPENROUTER_API_KEY",
      vertex: "GOOGLE_VERTEX_KEY",
      bedrock: "AWS_ACCESS_KEY_ID",
      mistral: "MISTRAL_API_KEY",
      fireworks: "FIREWORKS_API_KEY",
      together: "TOGETHER_API_KEY",
    };
    return process.env[envMap[provider] || ""];
  }

  _handleStdout(data) {
    const text = data.toString();
    this.pendingStdout += text;

    let newlineIdx;
    while ((newlineIdx = this.pendingStdout.indexOf("\n")) !== -1) {
      let line = this.pendingStdout.slice(0, newlineIdx);
      this.pendingStdout = this.pendingStdout.slice(newlineIdx + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.trim()) continue;

      try {
        const parsed = JSON.parse(line);
        this._dispatchEvent(parsed);
      } catch {
        // Skip unparseable lines (startup noise)
      }
    }
  }

  _dispatchEvent(event) {
    // Check if this is a response to a pending request
    if (event.type === "response" && event.id) {
      const resolver = this.pendingRequests.get(event.id);
      if (resolver) {
        this.pendingRequests.delete(event.id);
        resolver.resolve(event);
        return;
      }
    }

    // Extension UI requests need special handling
    if (event.type === "extension_ui_request") {
      this.emit("extension_ui_request", event);
      return;
    }

    // Forward events to clients
    this.emit("event", event);
  }

  async send(command) {
    if (command == null || typeof command !== "object") {
      throw new Error("RpcAgent.send() requires a non-null object command");
    }
    if (!this.proc || !this.proc.stdin || this.proc.stdin.destroyed) {
      throw new Error("RPC agent not running");
    }
    return new Promise((resolve, reject) => {
      const id = command.id || randomUUID();
      command.id = id;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${id} timed out`));
      }, 60000);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      if (!this.proc.stdin.writable) {
        this.pendingRequests.delete(id);
        clearTimeout(timeout);
        reject(new Error("RPC agent stdin is not writable"));
        return;
      }
      this.proc.stdin.write(JSON.stringify(command) + "\n");
    });
  }

  async prompt(message, options = {}) {
    return this.send({
      type: "prompt",
      message,
      streamingBehavior: options.streamingBehavior,
      images: options.images,
    });
  }

  async abort() {
    return this.send({ type: "abort" });
  }

  async getMessages() {
    const resp = await this.send({ type: "get_messages" });
    return resp.data?.messages || [];
  }

  async getState() {
    const resp = await this.send({ type: "get_state" });
    return resp.data;
  }

  async getAvailableModels() {
    const resp = await this.send({ type: "get_available_models" });
    return resp.data?.models || [];
  }

  async setModel(provider, modelId) {
    return this.send({ type: "set_model", provider, modelId });
  }

  async setThinkingLevel(level) {
    return this.send({ type: "set_thinking_level", level });
  }

  async getCommands() {
    const resp = await this.send({ type: "get_commands" });
    return resp.data?.commands || [];
  }

  async getForkMessages() {
    const resp = await this.send({ type: "get_fork_messages" });
    return resp.data?.messages || [];
  }

  async newSession() {
    return this.send({ type: "new_session" });
  }

  async compact(customInstructions) {
    return this.send({ type: "compact", customInstructions });
  }

  async exportHtml() {
    return this.send({ type: "export_html" });
  }

  async getSessionStats() {
    return this.send({ type: "get_session_stats" });
  }

  stop() {
    if (this.proc) {
      // Detach exit/error handlers so killing the process doesn't
      // trigger notifications to clients (e.g. during workspace restart)
      this.proc.removeAllListeners("exit");
      this.proc.removeAllListeners("error");
      this.proc.kill("SIGTERM");
      this.proc = null;
    }
  }

  async restart() {
    console.log(`[rpc] Restarting agent with cwd: ${currentWorkspace}`);
    this.stop();
    this.isRunning = false;
    await this.start();
    this.isRunning = true;
    console.log("[rpc] Agent restarted");
  }
}

// ─── Agent Instance ─────────────────────────────────────────────────────────

const agent = new RpcAgent();

// ─── WebSocket Client Management ────────────────────────────────────────────

const clients = new Map();
let currentSessionId = null;
let currentSessionMessages = []; // Track messages for current session
let pendingMessageSaves = new Map(); // clientId -> pending save timeout

function saveCurrentSession() {
  if (!currentSessionId) return;
  updateSession(currentSessionId, {
    messageCount: currentSessionMessages.length,
    messages: currentSessionMessages,
  });
}

function scheduleMessageSave(clientId) {
  if (pendingMessageSaves.has(clientId)) {
    clearTimeout(pendingMessageSaves.get(clientId));
  }
  pendingMessageSaves.set(clientId, setTimeout(() => {
    saveCurrentSession();
    pendingMessageSaves.delete(clientId);
  }, 2000));
}

wss.on("connection", (ws) => {
  const clientId = randomUUID();
  clients.set(clientId, { ws, ready: false });

  // Send initial state
  ws.send(JSON.stringify({ type: "connected", clientId }));

  // If agent is running, notify new client
  if (agent.isRunning) {
    ws.send(JSON.stringify({ type: "agent_status", status: "running" }));
  }

  ws.on("message", async (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    try {
      switch (msg.type) {
        case "prompt":
          await agent.prompt(msg.message, {
            streamingBehavior: msg.streamingBehavior,
            images: msg.images || null,
          });
          ws.send(JSON.stringify({ type: "response", success: true }));
          break;

        case "abort":
          await agent.abort();
          ws.send(JSON.stringify({ type: "response", success: true }));
          break;

        case "get_messages": {
          // Return current session's messages
          const messages = currentSessionMessages;
          ws.send(JSON.stringify({ type: "messages", messages }));
          break;
        }

        case "get_state": {
          const state = await agent.getState();
          ws.send(JSON.stringify({ type: "state", state }));
          break;
        }

        case "get_available_models": {
          const models = await agent.getAvailableModels();
          ws.send(JSON.stringify({ type: "models", models }));
          break;
        }

        case "set_model": {
          const resp = await agent.setModel(msg.provider, msg.modelId);
          ws.send(JSON.stringify({ type: "model_set", success: resp.success, data: resp.data }));
          break;
        }

        case "set_thinking_level": {
          const resp = await agent.send({ type: "set_thinking_level", level: msg.level });
          ws.send(JSON.stringify({ type: "thinking_level_set", success: resp.success }));
          break;
        }

        case "get_commands": {
          const commands = await agent.getCommands();
          ws.send(JSON.stringify({ type: "commands", commands }));
          break;
        }

        case "get_fork_messages": {
          const messages = await agent.getForkMessages();
          ws.send(JSON.stringify({ type: "fork_messages", messages }));
          break;
        }

        case "new_session": {
          // Save current session before creating new one
          if (currentSessionId) {
            saveCurrentSession();
          }
          const newSession = createSession();
          currentSessionId = newSession.id;
          currentSessionMessages = [];
          const resp = await agent.newSession();
          ws.send(JSON.stringify({ type: "session_new", success: resp.success, data: resp.data, sessionId: newSession.id, sessionName: newSession.name }));
          break;
        }

        case "list_sessions": {
          const sessions = listSessions();
          ws.send(JSON.stringify({ type: "sessions_list", sessions }));
          break;
        }

        case "switch_session": {
          // Save current session
          if (currentSessionId) {
            saveCurrentSession();
          }
          const targetSession = loadSession(msg.sessionId);
          if (!targetSession) {
            ws.send(JSON.stringify({ type: "error", message: "Session not found" }));
            break;
          }
          currentSessionId = targetSession.id;
          currentSessionMessages = targetSession.messages || [];
          ws.send(JSON.stringify({ type: "session_switched", sessionId: targetSession.id, session: targetSession, messages: currentSessionMessages }));
          break;
        }

        case "delete_session": {
          if (currentSessionId === msg.sessionId) {
            ws.send(JSON.stringify({ type: "error", message: "Cannot delete the current session. Switch to another session first." }));
            break;
          }
          deleteSession(msg.sessionId);
          ws.send(JSON.stringify({ type: "session_deleted", sessionId: msg.sessionId }));
          break;
        }

        case "rename_session": {
          const session = updateSession(msg.sessionId, { name: msg.name });
          if (!session) {
            ws.send(JSON.stringify({ type: "error", message: "Session not found" }));
            break;
          }
          ws.send(JSON.stringify({ type: "session_renamed", session }));
          break;
        }

        case "compact": {
          const resp = await agent.compact(msg.customInstructions);
          ws.send(JSON.stringify({ type: "compacted", success: resp.success, data: resp.data }));
          break;
        }

        case "export_html": {
          const resp = await agent.exportHtml();
          ws.send(JSON.stringify({ type: "html_exported", success: resp.success, data: resp.data }));
          break;
        }

        case "get_session_stats": {
          const resp = await agent.getSessionStats();
          ws.send(JSON.stringify({ type: "session_stats", success: resp.success, data: resp.data }));
          break;
        }

        // ─── Benchmark Commands ─────────────────────────────────────────────
        case "benchmark_start": {
          const resp = await benchmark.start();
          ws.send(JSON.stringify({ type: "benchmark_start_response", ...resp }));
          break;
        }

        case "benchmark_stop": {
          const resp = benchmark.stop();
          ws.send(JSON.stringify({ type: "benchmark_stop_response", ...resp }));
          break;
        }

        case "benchmark_get_config": {
          if (!benchmark.config) {
            await benchmark.loadConfig();
          }
          ws.send(JSON.stringify({ type: "benchmark_config", config: benchmark.config }));
          break;
        }

        case "benchmark_get_results": {
          const results = await benchmark.getResults();
          ws.send(JSON.stringify({ type: "benchmark_results", results }));
          break;
        }

        case "extension_ui_response": {
          // Forward extension UI responses back to the agent
          await agent.send(msg);
          break;
        }

        default:
          ws.send(JSON.stringify({ type: "error", message: `Unknown command: ${msg.type}` }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", message: err.message }));
    }
  });

  ws.on("close", () => {
    clients.delete(clientId);
  });

  ws.on("error", (err) => {
    console.error(`[ws client ${clientId}] Error:`, err.message);
    clients.delete(clientId);
  });
});

// ─── Agent Event Forwarding ─────────────────────────────────────────────────

agent.on("event", (event) => {
  // Persist messages when agent_end fires
  if (event.type === "agent_end" && event.messages && currentSessionId) {
    for (const msg of event.messages) {
      if (msg.role !== "user") {
        const existingIdx = currentSessionMessages.findIndex(m => m.id === msg.id);
        if (existingIdx >= 0) {
          currentSessionMessages[existingIdx] = msg;
        } else {
          currentSessionMessages.push(msg);
        }
      }
    }
    saveCurrentSession();
  }

  // Handle load_session requests
  if (event.type === "load_session_response") {
    // Agent confirmed session loaded
    return;
  }

  const data = JSON.stringify(event);
  for (const [id, client] of clients) {
    try {
      client.ws.send(data);
    } catch {
      // Client disconnected
    }
  }
});

agent.on("stderr", (msg) => {
  for (const [id, client] of clients) {
    try {
      client.ws.send(JSON.stringify({ type: "stderr", message: msg }));
    } catch {}
  }
});

agent.on("extension_ui_request", (event) => {
  for (const [id, client] of clients) {
    try {
      client.ws.send(JSON.stringify(event));
    } catch {}
  }
});

agent.on("exit", (code, signal) => {
  for (const [id, client] of clients) {
    try {
      client.ws.send(JSON.stringify({ type: "agent_exit", code, signal }));
    } catch {}
  }
});

agent.on("error", (err) => {
  for (const [id, client] of clients) {
    try {
      client.ws.send(JSON.stringify({ type: "agent_error", message: err.message }));
    } catch {}
  }
});

// ─── Benchmark Manager ──────────────────────────────────────────────────────

class BenchmarkManager {
  constructor() {
    this.proc = null;
    this.isRunning = false;
    this.config = null;
    this.results = [];
    this.listeners = new Map();
    this.benchmarkDir = join(__dirname, '..', 'benchmark');
    // Live metrics state
    this.currentTestRun = 0;
    this.liveResults = [];
    this.benchmarkStatus = 'idle';
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
  }

  emit(event, ...args) {
    const fns = this.listeners.get(event) || [];
    for (const fn of fns) fn(...args);
  }

  async loadConfig() {
    const { readFileSync } = await import('node:fs');
    try {
      const configPath = join(this.benchmarkDir, 'configs.json');
      this.config = JSON.parse(readFileSync(configPath, 'utf8'));
      return this.config;
    } catch (err) {
      console.error(`[benchmark] Failed to load config: ${err.message}`);
      return null;
    }
  }

  async start() {
    if (this.isRunning) {
      return { success: false, reason: 'Benchmark is already running' };
    }

    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config) {
      return { success: false, reason: 'Failed to load benchmark config' };
    }

    const { spawn } = await import('node:child_process');

    console.log('[benchmark] Starting benchmark script...');
    this.benchmarkStatus = 'building';
    this.currentTestRun = 0;
    this.liveResults = [];
    this.emit('status', 'building');

    this.proc = spawn('node', ['index.js'], {
      cwd: this.benchmarkDir,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.isRunning = true;

    this.proc.stdout.on('data', (data) => {
      const text = data.toString();
      this.emit('stdout', text);
      console.log(`[benchmark stdout] ${text.trim()}`);
      this.parseLogOutput(text);
    });

    this.proc.stderr.on('data', (data) => {
      const text = data.toString();
      this.emit('stderr', text);
      console.error(`[benchmark stderr] ${text.trim()}`);
    });

    this.proc.on('close', (code) => {
      this.isRunning = false;
      this.proc = null;
      console.log(`[benchmark] Exited with code ${code}`);
      if (code === 0) {
        this.benchmarkStatus = 'idle';
        this.emit('status', 'idle', { testRun: this.currentTestRun, liveResults: this.liveResults, finished: true });
      } else {
        this.benchmarkStatus = 'error';
        this.emit('status', 'error', { error: `Process exited with code ${code}`, testRun: this.currentTestRun, liveResults: this.liveResults, finished: true });
      }
      this.emit('exit', code);
    });

    this.proc.on('error', (err) => {
      this.isRunning = false;
      this.proc = null;
      console.error(`[benchmark] Error: ${err.message}`);
      this.benchmarkStatus = 'error';
      this.emit('status', 'error', { error: err.message, testRun: this.currentTestRun, liveResults: this.liveResults, finished: true });
      this.emit('error', err.message);
    });

    return { success: true };
  }

  // Parse benchmark log output for live metrics (matches api-server.js format)
  parseLogOutput(text) {
    // Parse "========== Test Run #N =========="
    const runMatch = text.match(/Test Run #(\d+)/);
    if (runMatch) {
      this.currentTestRun = parseInt(runMatch[1], 10);
      this.benchmarkStatus = 'testing';
      this.emit('status', 'testing', { testRun: this.currentTestRun, liveResults: this.liveResults });
    }

    // Parse "Avg gen tokens/sec:    XXX"
    const genMatch = text.match(/Avg gen tokens\/sec:\s+([\d.]+)/);
    const promptMatch = text.match(/Avg prompt tokens\/sec:\s+([\d.]+)/);
    const totalGenMatch = text.match(/Total tokens:\s+([\d.]+)\s*\(gen\)/);
    const totalPromptMatch = text.match(/Total tokens:\s+[\d.]+\s*\(gen\) \/ ([\d.]+)/);
    const totalTimeMatch = text.match(/Total time \(all msgs\):\s+([\d.]+)\s*ms/);
    const memMatch = text.match(/Avg Mem Used \(GB\):\s+([\d.]+)/);

    if (genMatch && promptMatch) {
      const runId = this.currentTestRun;
      const existingIdx = this.liveResults.findIndex((r) => r.testRunId === runId);

      const result = {
        testRunId: runId,
        avgGenTokensPerSec: parseFloat(genMatch[1]),
        avgPromptTokensPerSec: parseFloat(promptMatch[1]),
        totalGenTokens: totalGenMatch ? parseFloat(totalGenMatch[1]) : null,
        totalPromptTokens: totalPromptMatch ? parseFloat(totalPromptMatch[1]) : null,
        totalTimeMs: totalTimeMatch ? parseFloat(totalTimeMatch[1]) : null,
        avgMemUsed: memMatch ? parseFloat(memMatch[1]) : null,
      };

      if (existingIdx >= 0) {
        this.liveResults[existingIdx] = result;
      } else {
        this.liveResults.push(result);
      }

      this.emit('results', { liveResults: this.liveResults });
    }
  }

  stop() {
    if (!this.proc) return { success: false, reason: 'Benchmark is not running' };

    console.log('[benchmark] Stopping benchmark...');
    this.benchmarkStatus = 'stopped';
    this.emit('status', 'stopped', { testRun: this.currentTestRun, liveResults: this.liveResults });
    const proc = this.proc;
    this.proc = null;
    proc.kill('SIGTERM');

    // Force kill after 5 seconds
    setTimeout(() => {
      if (proc.killed === false) {
        proc.kill('SIGKILL');
      }
    }, 5000);

    return { success: true };
  }

  getStatus() {
    return {
      running: this.isRunning,
      config: this.config,
    };
  }

  async getResults() {
    const { readFileSync } = await import('node:fs');
    try {
      const resultsPath = join(this.benchmarkDir, 'results.md');
      return readFileSync(resultsPath, 'utf8');
    } catch (err) {
      return '# No results yet\n\nStart the benchmark to generate results.';
    }
  }
}

const benchmark = new BenchmarkManager();

// ─── API Routes ─────────────────────────────────────────────────────────────

app.get('/api/benchmark/config', protectApi, async (req, res) => {
  if (!benchmark.config) {
    await benchmark.loadConfig();
  }
  res.json(benchmark.config);
});

app.post('/api/benchmark/start', protectApi, async (req, res) => {
  const result = await benchmark.start();
  res.json(result);
});

app.post('/api/benchmark/stop', protectApi, (req, res) => {
  const result = benchmark.stop();
  res.json(result);
});

app.get('/api/benchmark/status', protectApi, async (req, res) => {
  res.json(benchmark.getStatus());
});

app.get('/api/benchmark/results', protectApi, async (req, res) => {
  const results = await benchmark.getResults();
  res.json({ results });
});

// ─── Benchmark REST API (for benchmark frontend) ────────────────────────────

const BENCHMARK_DIR = join(__dirname, '..', 'benchmark');
const CONFIGS_FILE = join(BENCHMARK_DIR, 'configs.json');
const RESULTS_FILE = join(BENCHMARK_DIR, 'results.md');
const REPORTS_DIR = join(BENCHMARK_DIR, 'reports');

// Ensure reports directory exists
const { mkdirSync: _mkdirSync, writeFileSync: _writeFileSync, readdirSync: _readdirSync, unlinkSync: _unlinkSync, statSync: _statSync } = await import('node:fs');
if (!existsSync(REPORTS_DIR)) {
  _mkdirSync(REPORTS_DIR, { recursive: true });
}

// In-memory state for REST API
let benchmarkSSEClients = new Set();
let sseHeartbeats = new Map();

// Config endpoints
app.get('/api/configs', protectApi, (req, res) => {
  try {
    const configs = JSON.parse(readFileSync(CONFIGS_FILE, 'utf8'));
    res.json({ success: true, data: configs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/configs', protectApi, (req, res) => {
  try {
    const configs = req.body;
    // Validate config structure — must be an object with expected keys
    if (typeof configs !== 'object' || configs === null || Array.isArray(configs)) {
      return res.status(400).json({ success: false, error: 'Config must be a JSON object' });
    }
    // Validate each config entry has required fields
    for (const [key, value] of Object.entries(configs)) {
      if (typeof key !== 'string' || typeof value !== 'object' || value === null) {
        return res.status(400).json({ success: false, error: `Invalid config entry: ${key}` });
      }
      if (!value.provider || typeof value.provider !== 'string') {
        return res.status(400).json({ success: false, error: `Config entry ${key} missing 'provider'` });
      }
      if (!value.model || typeof value.model !== 'string') {
        return res.status(400).json({ success: false, error: `Config entry ${key} missing 'model'` });
      }
    }
    _writeFileSync(CONFIGS_FILE, JSON.stringify(configs, null, 2));
    res.json({ success: true, message: 'Config saved' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Status endpoint
app.get('/api/status', protectApi, (req, res) => {
  res.json({
    success: true,
    status: benchmark.benchmarkStatus,
    testRun: benchmark.currentTestRun,
    liveResults: benchmark.liveResults,
    processAlive: benchmark.proc ? true : false,
  });
});

// SSE stream endpoint
app.get('/api/stream', protectApi, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const client = { res };
  benchmarkSSEClients.add(client);

  // Send initial status
  sendSSE(client, 'status', {
    status: benchmark.benchmarkStatus,
    testRun: benchmark.currentTestRun,
    liveResults: benchmark.liveResults,
  });

  // Send heartbeat
  const heartbeat = setInterval(() => {
    sendSSE(client, 'heartbeat', { ts: Date.now() });
  }, 15000);

  sseHeartbeats.set(client, heartbeat);

  req.on('close', () => {
    benchmarkSSEClients.delete(client);
    clearInterval(heartbeat);
    sseHeartbeats.delete(client);
  });
});

function sendSSE(client, event, data) {
  if (!benchmarkSSEClients.has(client)) return;
  try {
    client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch (err) {
    console.error(`[sse] Write error for client, removing: ${err.message}`);
    benchmarkSSEClients.delete(client);
  }
}

// Run endpoint
app.post('/api/run', protectApi, async (req, res) => {
  if (benchmark.isRunning) {
    return res.status(409).json({
      success: false,
      error: 'Benchmark is already running',
    });
  }

  try {
    const result = await benchmark.start();
    if (result.success) {
      res.json({ success: true, message: 'Benchmark started' });
    } else {
      res.status(500).json({ success: false, error: result.reason });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stop endpoint
app.post('/api/stop', protectApi, (req, res) => {
  const result = benchmark.stop();
  res.json(result);
});

// Results endpoint
app.get('/api/results', protectApi, (req, res) => {
  try {
    const content = existsSync(RESULTS_FILE) ? readFileSync(RESULTS_FILE, 'utf8') : '';
    res.json({ success: true, data: content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reports endpoints
app.get('/api/reports', protectApi, (req, res) => {
  try {
    const files = existsSync(REPORTS_DIR)
      ? _readdirSync(REPORTS_DIR).filter(f => f.endsWith('.json'))
      : [];
    const reports = files.map(file => {
      const stats = _statSync(join(REPORTS_DIR, file));
      const name = file.replace(/\.json$/, '');
      return {
        name,
        filename: file,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    }).sort((a, b) => b.modified - a.modified);
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/report/:name', protectApi, (req, res) => {
  try {
    const filePath = join(REPORTS_DIR, `${req.params.name}.json`);
    // Validate resolved path stays within REPORTS_DIR
    if (!filePath.startsWith(REPORTS_DIR + "/") && filePath !== REPORTS_DIR) {
      return res.status(400).json({ success: false, error: 'Invalid report name' });
    }
    if (!existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/report', protectApi, (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ success: false, error: 'name and data required' });
    }
    if (typeof data !== 'object' || data === null || Array.isArray(data) === false && typeof data !== 'object') {
      return res.status(400).json({ success: false, error: 'data must be an object' });
    }
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = join(REPORTS_DIR, `${safeName}.json`);
    let jsonStr;
    try {
      jsonStr = JSON.stringify(data, null, 2);
    } catch (stringifyErr) {
      return res.status(400).json({ success: false, error: 'data is not JSON-serializable' });
    }
    _writeFileSync(filePath, jsonStr);
    res.json({ success: true, message: 'Report saved' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/report/:name', protectApi, (req, res) => {
  try {
    const filePath = join(REPORTS_DIR, `${req.params.name}.json`);
    // Validate resolved path stays within REPORTS_DIR
    if (!filePath.startsWith(REPORTS_DIR + "/") && filePath !== REPORTS_DIR) {
      return res.status(400).json({ success: false, error: 'Invalid report name' });
    }
    if (!existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    _unlinkSync(filePath);
    res.json({ success: true, message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save current results as report
app.post('/api/save-report', protectApi, (req, res) => {
  try {
    const { name } = req.body;
    const safeName = name || `benchmark-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}`;
    const mdContent = existsSync(RESULTS_FILE) ? readFileSync(RESULTS_FILE, 'utf8') : '';
    const configs = existsSync(CONFIGS_FILE) ? JSON.parse(readFileSync(CONFIGS_FILE, 'utf8')) : {};

    const report = {
      name: safeName,
      savedAt: new Date().toISOString(),
      mdContent,
      liveResults: benchmark.liveResults,
      configs,
    };

    const filePath = join(REPORTS_DIR, `${safeName}.json`);
    _writeFileSync(filePath, JSON.stringify(report, null, 2));
    res.json({ success: true, message: `Report saved as ${safeName}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Wire benchmark events to SSE clients ───────────────────────────────────

benchmark.on('stdout', (text) => {
  // Forward to SSE clients
  for (const client of benchmarkSSEClients) {
    try {
      client.res.write(`event: log\ndata: ${JSON.stringify({ type: 'stdout', text, status: benchmark.benchmarkStatus, testRun: benchmark.currentTestRun, liveResults: benchmark.liveResults })}\n\n`);
    } catch {}
  }
  // Also forward to WebSocket clients
  const wsData = JSON.stringify({ type: 'benchmark_stdout', message: text });
  for (const [id, client] of clients) {
    try { client.ws.send(wsData); } catch {}
  }
});

benchmark.on('stderr', (text) => {
  for (const client of benchmarkSSEClients) {
    try {
      client.res.write(`event: log\ndata: ${JSON.stringify({ type: 'stderr', text, status: benchmark.benchmarkStatus, testRun: benchmark.currentTestRun, liveResults: benchmark.liveResults })}\n\n`);
    } catch {}
  }
  const wsData = JSON.stringify({ type: 'benchmark_stderr', message: text });
  for (const [id, client] of clients) {
    try { client.ws.send(wsData); } catch {}
  }
});

benchmark.on('status', (status, extra) => {
  const payload = { status, testRun: benchmark.currentTestRun, liveResults: benchmark.liveResults, ...extra };
  for (const client of benchmarkSSEClients) {
    try {
      client.res.write(`event: status\ndata: ${JSON.stringify(payload)}\n\n`);
    } catch {}
  }
  const wsData = JSON.stringify({ type: 'benchmark_status', status, testRun: benchmark.currentTestRun, liveResults: benchmark.liveResults });
  for (const [id, client] of clients) {
    try { client.ws.send(wsData); } catch {}
  }
});

benchmark.on('exit', (code) => {
  for (const client of benchmarkSSEClients) {
    try {
      client.res.write(`event: status\ndata: ${JSON.stringify({ status: 'idle', testRun: benchmark.currentTestRun, liveResults: benchmark.liveResults, finished: true, code })}\n\n`);
    } catch {}
  }
  const wsData = JSON.stringify({ type: 'benchmark_exit', code });
  for (const [id, client] of clients) {
    try { client.ws.send(wsData); } catch {}
  }
});

benchmark.on('error', (message) => {
  for (const client of benchmarkSSEClients) {
    try {
      client.res.write(`event: status\ndata: ${JSON.stringify({ status: 'error', error: message, finished: true, testRun: benchmark.currentTestRun, liveResults: benchmark.liveResults })}\n\n`);
    } catch {}
  }
  const wsData = JSON.stringify({ type: 'benchmark_error', message });
  for (const [id, client] of clients) {
    try { client.ws.send(wsData); } catch {}
  }
});

benchmark.on('results', ({ liveResults }) => {
  for (const client of benchmarkSSEClients) {
    try {
      client.res.write(`event: results\ndata: ${JSON.stringify({ liveResults, status: benchmark.benchmarkStatus, testRun: benchmark.currentTestRun })}\n\n`);
    } catch {}
  }
});

// ─── Global Error Handler ───────────────────────────────────────────────────
// Catches body-parser errors (e.g. non-object JSON) and all other unhandled errors.
// Prevents Express's default handler from exposing HTML stack traces.
app.use((err, req, res, next) => {
  console.error(`[error] ${err.status || 500} - ${err.message}`);
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, error: "Invalid JSON body" });
  }
  res.status(err.status || 500).json({ success: false, error: "Internal server error" });
});

// ─── Start Everything ───────────────────────────────────────────────────────

async function main() {
  console.log(`[server] Starting Betty web frontend on ${HOST}:${PORT}`);
  console.log(`[server] Open http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT} in your browser`);
  console.log(`[server] Set PORT env var to change the port`);
  console.log(`[server] Set HOST env var to bind to a specific address`);
  console.log();

  try {
    await agent.start();
    agent.isRunning = true;
    console.log("[server] RPC agent started");

    // Notify all clients
    for (const [id, client] of clients) {
      try {
        client.ws.send(JSON.stringify({ type: "agent_status", status: "running" }));
      } catch {}
    }
  } catch (err) {
    console.error("[server] Failed to start RPC agent:", err.message);
    // Still start the HTTP server so clients can see an error page
  }

  httpServer.listen(PORT, HOST, () => {
    console.log(`[server] Web interface: http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  });

  // Graceful shutdown
  process.on("SIGINT", () => shutdown());
  process.on("SIGTERM", () => shutdown());
}

function shutdown() {
  console.log("\n[server] Shutting down...");
  // Clear pending message saves
  for (const [, timer] of pendingMessageSaves) {
    clearTimeout(timer);
  }
  pendingMessageSaves.clear();
  // Clear SSE heartbeats
  for (const [, timer] of sseHeartbeats) {
    clearInterval(timer);
  }
  sseHeartbeats.clear();
  // Close benchmark SSE clients
  for (const client of benchmarkSSEClients) {
    try { client.res.end(); } catch {}
  }
  benchmarkSSEClients.clear();
  agent.stop();
  for (const [, client] of clients) {
    client.ws.close();
  }
  wss.close();
  httpServer.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("[server] Fatal error:", err);
  process.exit(1);
});
