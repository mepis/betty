/**
 * Web server that wraps pi's RPC mode and exposes a WebSocket API.
 *
 * WebSocket message protocol:
 *   Client → Server (JSON):
 *     { type: "prompt", message: string, images?: Array<{type:"image",data:string,mimeType:string}> }
 *     { type: "abort" }
 *     { type: "set_model", provider: string, modelId: string }
 *     { type: "set_thinking_level", level: string }
 *     { type: "get_state" }
 *     { type: "get_messages" }
 *     { type: "get_available_models" }
 *     { type: "new_session" }
 *     { type: "compact" }
 *     { type: "get_session_stats" }
 *     { type: "get_fork_messages" }
 *     { type: "fork", entryId: string }
 *     { type: "clone" }
 *     { type: "switch_session", sessionPath: string }
 *     { type: "set_session_name", name: string }
 *     { type: "get_commands" }
 *     { type: "steer", message: string, images?: [...] }
 *     { type: "follow_up", message: string, images?: [...] }
 *     { type: "bash", command: string }
 *
 *   Server → Client (JSON):
 *     { type: "message_update", delta: string, contentIndex: number }
 *     { type: "thinking_update", delta: string }
 *     { type: "tool_call", toolCallId: string, toolName: string, args: object }
 *     { type: "tool_result", toolCallId: string, toolName: string, content: string, isError: boolean }
 *     { type: "agent_start" }
 *     { type: "agent_end", messages: AgentMessage[] }
 *     { type: "turn_start" }
 *     { type: "turn_end" }
 *     { type: "compaction_start", reason: string }
 *     { type: "compaction_end", reason: string }
 *     { type: "error", message: string }
 *     { type: "state", data: object }
 *     { type: "messages", data: { messages: AgentMessage[] } }
 *     { type: "models", data: { models: Model[] } }
 *     { type: "stats", data: object }
 *     { type: "fork_messages", data: { messages: Array<{entryId:string,text:string}> } }
 *     { type: "commands", data: { commands: Array<{name:string,description:string,source:string}> } }
 *     { type: "ui_request", id: string, method: string, ... }
 *     { type: "session_switched", cancelled: boolean }
 *     { type: "queue_update", steering: string[], followUp: string[] }
 *     { type: "auto_retry_start", ... }
 *     { type: "auto_retry_end", ... }
 */

import { spawn, type ChildProcess } from "node:child_process";
import dotenv from "dotenv";

// Load .env file
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
import { WebSocketServer, WebSocket } from "ws";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import selfsigned from "selfsigned";
import { userStore } from "./src/server/userStore";
import { sessionStore } from "./src/server/sessionStore";
import { initDatabase, closeDatabase, checkHealthFull } from "./src/server/db";
import { generateToken, verifyToken, type JwtPayload } from "./src/server/auth";
import { hasPermission, isAdmin, type UserRole } from "./src/server/permissions";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── HTTPS Configuration ───────────────────────────────────────────────────

const useHttps = process.env.HTTPS === "true";
const httpsCertPath = process.env.HTTPS_CERT_PATH;
const httpsKeyPath = process.env.HTTPS_KEY_PATH;

// ─── Authentication Configuration ──────────────────────────────────────────

const authEnabled = process.env.AUTH_ENABLED !== "false"; // true by default

// MIME types for static file serving
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".map": "application/json",
};

// Safe extensions allowlist for static file serving
const SAFE_EXTENSIONS = new Set(Object.keys(MIME_TYPES));

// S-15: Max file size for static file serving (100MB)
const MAX_STATIC_FILE_SIZE = parseInt(process.env.MAX_STATIC_FILE_SIZE || "104857600", 10);

// S-25: Max line length for RPC output parsing (prevents DoS via huge lines)
const MAX_RPC_LINE_LENGTH = parseInt(process.env.MAX_RPC_LINE_LENGTH || "1048576", 10); // 1MB

function getMime(ext: string): string {
  return MIME_TYPES[ext] || "application/octet-stream";
}

function serveStaticFile(
  req: IncomingMessage,
  res: ServerResponse,
  distDir: string,
): void {
  const url = req.url?.split("?")[0] || "/";
  let filePath = url === "/" ? "/index.html" : url;

  const fullPath = path.join(distDir, filePath);

  // Security: prevent directory traversal
  if (!fullPath.startsWith(distDir)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(fullPath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  // S-15: Check file size before serving
  try {
    const stat = fs.statSync(fullPath);
    if (stat.size > MAX_STATIC_FILE_SIZE) {
      res.writeHead(413, { "Content-Type": "text/plain" });
      res.end("File too large");
      return;
    }
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal server error");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();

  // Validate Content-Type: only serve files with known safe extensions
  if (!SAFE_EXTENSIONS.has(ext)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  const mime = getMime(ext);

  res.writeHead(200, {
    "Content-Type": mime,
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  fs.createReadStream(fullPath).pipe(res);
}

function parseBody(req: IncomingMessage, res: ServerResponse): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
      resolve(null);
      return;
    }
    const chunks: Buffer[] = [];
    let totalSize = 0;
    const maxSize = 1024 * 1024; // 1MB limit
    let responded = false;
    const sendError = (code: number, msg: string) => {
      if (responded) return;
      responded = true;
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: msg }));
    };
    // Timeout to prevent slow/lively attacks (10 seconds)
    const timeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        res.writeHead(408, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Request timeout" }));
      }
      resolve(null);
      if (!req.destroyed) req.destroy();
    }, 10000);
    req.on("data", (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > maxSize) {
        sendError(413, "Request entity too large");
        resolve(null);
        if (!req.destroyed) req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      clearTimeout(timeout);
      if (responded) return;
      if (chunks.length === 0) {
        resolve(null);
        return;
      }
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
        resolve(body);
      } catch {
        resolve(null);
      }
    });
    req.on("error", () => {
      clearTimeout(timeout);
      if (!responded) {
        responded = true;
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Bad request" }));
      }
      resolve(null);
    });
  });
}

function getAuthToken(req: IncomingMessage): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

async function handleApiRoute(
  req: IncomingMessage,
  res: ServerResponse,
  body: Record<string, unknown> | null
): Promise<boolean> {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;
  const method = req.method;

  // POST /api/auth/login
  if (method === "POST" && pathname === "/api/auth/login") {
    if (!body || typeof body.username !== "string" || typeof body.password !== "string") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Username and password are required" }));
      return true;
    }
    const user = await userStore.authenticate(body.username, body.password);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid credentials" }));
      return true;
    }
    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ token, user }));
    return true;
  }

  // GET /api/me — get current authenticated user
  if (method === "GET" && pathname === "/api/me") {
    const token = getAuthToken(req);
    if (!token) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Authentication required" }));
      return true;
    }
    const payload = verifyToken(token);
    if (!payload) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid or expired token" }));
      return true;
    }
    const user = userStore.findUserById(payload.id);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "User not found" }));
      return true;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id: user.id, username: user.username, role: user.role }));
    return true;
  }

  // GET /api/users — list all users (admin only)
  if (method === "GET" && pathname === "/api/users") {
    const token = getAuthToken(req);
    if (!token) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Authentication required" }));
      return true;
    }
    const payload = verifyToken(token);
    if (!payload || !isAdmin(payload.role)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Admin access required" }));
      return true;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ users: userStore.getAllUsers() }));
    return true;
  }

  // POST /api/users — create user (admin only)
  if (method === "POST" && pathname === "/api/users") {
    const token = getAuthToken(req);
    if (!token) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Authentication required" }));
      return true;
    }
    const payload = verifyToken(token);
    if (!payload || !isAdmin(payload.role)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Admin access required" }));
      return true;
    }
    if (!body || typeof body.username !== "string" || typeof body.password !== "string") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Username and password are required" }));
      return true;
    }
    const role: UserRole = (body.role as UserRole) || "user";
    if (!["admin", "user", "viewer"].includes(role)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid role" }));
      return true;
    }
    try {
      const user = await userStore.createUser(body.username, body.password, role);
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ user }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: (err as Error).message }));
    }
    return true;
  }

  // PUT /api/users/:id — update user (admin only)
  if (method === "PUT" && pathname.startsWith("/api/users/")) {
    const token = getAuthToken(req);
    if (!token) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Authentication required" }));
      return true;
    }
    const payload = verifyToken(token);
    if (!payload || !isAdmin(payload.role)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Admin access required" }));
      return true;
    }
    const id = pathname.split("/").pop();
    if (!id) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "User ID required" }));
      return true;
    }
    const updates: { password?: string; role?: UserRole } = {};
    // S-30: Validate body properties before casting
    if (body?.password !== undefined && typeof body.password !== "string") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Password must be a string" }));
      return true;
    }
    if (body?.role !== undefined && !["admin", "user", "viewer"].includes(body.role as string)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid role" }));
      return true;
    }
    if (body?.password) updates.password = body.password as string;
    if (body?.role) updates.role = body.role as UserRole;
    if (!updates.password && !updates.role) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No updates provided" }));
      return true;
    }
    try {
      const user = await userStore.updateUser(id, updates);
      if (!user) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "User not found" }));
        return true;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ user }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: (err as Error).message }));
    }
    return true;
  }

  // DELETE /api/users/:id — delete user (admin only)
  if (method === "DELETE" && pathname.startsWith("/api/users/")) {
    const token = getAuthToken(req);
    if (!token) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Authentication required" }));
      return true;
    }
    const payload = verifyToken(token);
    if (!payload || !isAdmin(payload.role)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Admin access required" }));
      return true;
    }
    const id = pathname.split("/").pop();
    if (!id) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "User ID required" }));
      return true;
    }
    const deleted = await userStore.deleteUser(id);
    if (!deleted) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "User not found" }));
      return true;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
    return true;
  }

  return false;
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────

const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW || "60000", 10);
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
// Validation: RATE_LIMIT_WINDOW=0 or RATE_LIMIT_MAX=0 would cause permanent lockouts
if (rateLimitWindowMs <= 0 || rateLimitMax <= 0) {
  console.error("[server] RATE_LIMIT_WINDOW and RATE_LIMIT_MAX must be positive integers.");
  process.exit(1);
}
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimitCheck(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + rateLimitWindowMs });
    return true;
  }
  if (entry.count >= rateLimitMax) return false;
  entry.count++;
  return true;
}

function cleanupRateLimit(): void {
  const now = Date.now();
  // S-29: Collect keys to delete first, then delete (avoid modifying Map during iteration)
  const toDelete: string[] = [];
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetTime) {
      toDelete.push(ip);
    }
  }
  for (const ip of toDelete) {
    rateLimitMap.delete(ip);
  }
}

// Clean up expired entries every 5 minutes
setInterval(cleanupRateLimit, 5 * 60 * 1000);

function requestHandler(req: IncomingMessage, res: ServerResponse): void {
  // Rate limiting
  const ip = req.socket.remoteAddress || "unknown";
  if (!rateLimitCheck(ip)) {
    res.writeHead(429, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Too many requests" }));
    return;
  }

  // S-28: Guard against undefined req.url
  const url = req.url;
  if (!url) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Bad request" }));
    return;
  }

  // Health check
  if (url === "/health") {
    const health = await checkHealthFull();
    const status = health.ok ? "ok" : "degraded";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status,
      wsClients: wss.clients.size,
      https: useHttps,
      auth: authEnabled,
      db: {
        connected: health.db,
        pool: health.pool,
      },
    }));
    return;
  }

  // REST API routes
  if (url.startsWith("/api/")) {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;
    const method = req.method;
    const needsBody = method === "POST" || method === "PUT" || method === "PATCH";

    if (needsBody) {
      parseBody(req, res).then((body) => {
        if (!handleApiRoute(req, res, body)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Not found" }));
        }
      });
    } else {
      if (!handleApiRoute(req, res, null)) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      }
    }
    return;
  }

  // Serve static files from dist/ if available (production mode)
  const distDir = path.join(__dirname, "dist");
  if (fs.existsSync(distDir)) {
    serveStaticFile(req, res, distDir);
    return;
  }

  // Dev mode: informative message (safe — no user input reaches this path, so no XSS risk)
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`
    <h1>Betty Server</h1>
    <p>Build the frontend first: <code>npm run build</code></p>
    <p>Or run in dev mode: <code>npm run dev</code></p>
  `);
}

interface RpcCommand {
  id?: string;
  type: string;
  [key: string]: unknown;
}

interface RpcResponse {
  id?: string;
  type: "response";
  command: string;
  success: boolean;
  error?: string;
  data?: unknown;
}

interface RpcEvent {
  type: string;
  [key: string]: unknown;
}

interface ClientMessage {
  type: string;
  [key: string]: unknown;
}

// ─── RPC Client ──────────────────────────────────────────────────────────────

class PiRpcClient {
  private proc: ChildProcess | null = null;
  private buffer = "";
  private pendingResponses: Map<string, (data: unknown) => void> = new Map();
  private eventListeners: Array<(event: RpcEvent) => void> = [];
  private uiRequestHandlers: Map<
    string,
    (response: unknown) => void
  > = new Map();
  private _isRunning = false;

  async start(options?: {
    provider?: string;
    model?: string;
    noSession?: boolean;
    sessionDir?: string;
    thinkingLevel?: string;
    apikey?: string;
    verbose?: boolean;
  }): Promise<void> {
    const args: string[] = ["--mode", "rpc"];
    if (options?.provider) args.push("--provider", options.provider);
    if (options?.model) args.push("--model", options.model);
    if (options?.noSession) args.push("--no-session");
    if (options?.sessionDir) args.push("--session-dir", options.sessionDir);
    if (options?.thinkingLevel)
      args.push("--thinking", options.thinkingLevel);
    if (options?.apikey) args.push("--api-key", options.apikey);
    if (options?.verbose) args.push("--verbose");

    this.proc = spawn("pi", args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    return new Promise<void>((resolve, reject) => {
      this.proc!.stdout!.on("data", (chunk: Buffer) => this.handleOutput(chunk));
      this.proc!.stderr!.on("data", (chunk: Buffer) => {
        const msg = chunk.toString();
        // Log stderr but don't treat it as an error
        if (options?.verbose) {
          console.error("[pi stderr]", msg.trim());
        }
      });
      this.proc!.on("error", reject);
      this.proc!.on("close", (code) => {
        this._isRunning = false;
        if (code !== 0) {
          reject(new Error(`pi process exited with code ${code}`));
        }
      });
      this._isRunning = true;
      resolve();
    });
  }

  private handleOutput(chunk: Buffer): void {
    this.buffer += chunk.toString();
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf("\n")) !== -1) {
      let line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.trim()) continue;

      // S-25: Reject excessively long lines to prevent DoS
      if (line.length > MAX_RPC_LINE_LENGTH) {
        console.warn("[rpc] Line exceeded max length (", line.length, ">", MAX_RPC_LINE_LENGTH, ")");
        continue;
      }

      // S-31: Trim buffer if it grows too large (prevents unbounded memory growth)
      if (this.buffer.length > MAX_RPC_LINE_LENGTH * 10) {
        console.warn("[rpc] Buffer exceeded max size, truncating");
        this.buffer = "";
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        // S-17: Log silently dropped JSON lines instead of silently ignoring
        console.warn("[rpc] Failed to parse JSON line:", line.slice(0, 200));
        continue;
      }

      const msg = parsed as Record<string, unknown>;
      const eventType = msg.type as string;

      // S-18: Guard against missing type field after valid JSON.parse
      if (!eventType) {
        continue;
      }

      if (eventType === "response") {
        const resp = msg as RpcResponse;
        if (resp.id && this.pendingResponses.has(resp.id)) {
          const resolve = this.pendingResponses.get(resp.id)!;
          this.pendingResponses.delete(resp.id);
          resolve(resp.data ?? msg);
        }
      } else {
        // It's an event
        this.eventListeners.forEach((fn) => {
          try {
            fn(msg as RpcEvent);
          } catch (err) {
            console.error("[rpc] Event handler error:", (err as Error).message);
          }
        });
      }
    }
  }

  async send<T = unknown>(command: RpcCommand): Promise<T> {
    if (!this.proc?.stdin) throw new Error("pi not running");
    const id = command.id ?? `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    command.id = id;

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(id);
        reject(new Error(`RPC command timed out: ${command.type}`));
      }, 300000); // 5 min default

      this.pendingResponses.set(id, (data) => {
        clearTimeout(timeout);
        resolve(data as T);
      });

      const json = JSON.stringify(command) + "\n";
      this.proc!.stdin!.write(json);
    });
  }

  onEvent(fn: (event: RpcEvent) => void): void {
    this.eventListeners.push(fn);
  }

  onUiRequest(
    id: string,
    handler: (response: unknown) => void
  ): void {
    this.uiRequestHandlers.set(id, handler);
  }

  respondToUiRequest(id: string, response: unknown): void {
    if (!this.proc?.stdin) return;
    // S-23: Only include known safe fields, prevent data leak from spreading unknown properties
    const resp = response as Record<string, unknown> | undefined;
    const safeResponse: Record<string, unknown> = {};
    if (resp) {
      const allowedKeys = new Set(["result", "value", "ok", "error", "data", "message", "title", "status"]);
      for (const key of Object.keys(resp)) {
        if (allowedKeys.has(key)) {
          safeResponse[key] = resp[key];
        }
      }
    }
    const msg = JSON.stringify({ type: "extension_ui_response", id, ...safeResponse }) + "\n";
    this.proc.stdin.write(msg);
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  stop(): void {
    this.proc?.kill("SIGINT");
    this._isRunning = false;
  }

  clearPendingResponses(): void {
    this.pendingResponses.forEach((resolve) => {
      resolve(null);
    });
    this.pendingResponses.clear();
  }
}

// ─── WebSocket Server ────────────────────────────────────────────────────────

const wsPort = parseInt(process.env.WS_PORT || "3001", 10);
const piProvider = process.env.PI_PROVIDER;
const piModel = process.env.PI_MODEL;
const piNoSession = process.env.PI_NO_SESSION === "true";
const piSessionDir = process.env.PI_SESSION_DIR;
const piThinkingLevel = process.env.PI_THINKING_LEVEL;
const piApikey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
const piVerbose = process.env.PI_VERBOSE === "true";

const rpc = new PiRpcClient();

// ─── Create HTTP/HTTPS Server ──────────────────────────────────────────────

let server: ReturnType<typeof createServer>;

if (useHttps) {
  let cert: Buffer | undefined;
  let key: Buffer | undefined;

  if (httpsCertPath && httpsKeyPath && fs.existsSync(httpsCertPath) && fs.existsSync(httpsKeyPath)) {
    cert = fs.readFileSync(httpsCertPath);
    key = fs.readFileSync(httpsKeyPath);
  } else {
    // Generate self-signed certificate
    const certDir = path.join(process.cwd(), ".certs");
    if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });
    const certFile = path.join(certDir, "cert.pem");
    const keyFile = path.join(certDir, "key.pem");

    if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
      const pems = selfsigned.generate(
        [{ name: "commonName", value: "betty.local" }],
        { keySize: 2048, days: 365, algorithm: "sha256" },
      );
      fs.writeFileSync(certFile, pems.cert);
      fs.writeFileSync(keyFile, pems.private);
      console.log("[server] Generated self-signed certificate in .certs/");
    }

    cert = fs.readFileSync(certFile);
    key = fs.readFileSync(keyFile);
  }

  server = https.createServer({ cert, key }, requestHandler);
  console.log("[server] HTTPS enabled");
} else {
  server = createServer(requestHandler);
}

// Attach WebSocket server to the HTTP/HTTPS server (same port)
const wss = new WebSocketServer({ server });

// Map of client WebSocket → their individual RPC client (one pi per session)
const clientRpcs = new Map<WebSocket, PiRpcClient>();

// Map of client WebSocket → current session info
interface ClientSession {
  userId: string;
  sessionId: string;
}

const clientSessions = new Map<WebSocket, ClientSession>();

// Safe WebSocket send — checks readyState to prevent crashes on closed connections
function safeSend(ws: WebSocket, data: string): boolean {
  if (ws.readyState !== WebSocket.OPEN) return false;
  ws.send(data);
  return true;
}

async function spawnPiForClient(clientWs: WebSocket): Promise<PiRpcClient> {
  const existing = clientRpcs.get(clientWs);
  if (existing?.isRunning) return existing;

  // Stop old one if exists
  existing?.stop();

  const piClient = new PiRpcClient();

  // S-26: Catch start errors to avoid unhandled rejection
  try {
    await piClient.start({
      provider: piProvider,
      model: piModel,
      noSession: piNoSession,
      sessionDir: piSessionDir,
      thinkingLevel: piThinkingLevel,
      apikey: piApikey,
      verbose: piVerbose,
    });
  } catch (err) {
    safeSend(clientWs, JSON.stringify({ type: "error", message: `Failed to start pi: ${(err as Error).message}` }));
    throw err;
  }

  // TOCTOU fix: another concurrent call may have already set a client
  const nowExisting = clientRpcs.get(clientWs);
  if (nowExisting && nowExisting !== piClient) {
    piClient.stop();
    return nowExisting;
  }

  clientRpcs.set(clientWs, piClient);

  // Forward events from this client's pi to its WebSocket
  piClient.onEvent(async (event) => {
    // Filter out events that are just internal protocol noise
    if (event.type === "response") return;

    // Handle extension UI requests
    if (event.type === "extension_ui_request") {
      const req = event as Record<string, unknown>;
      const requestId = req.id as string;
      const method = req.method as string;

      // Set up handler for this UI request
      piClient.onUiRequest(requestId, (response) => {
        // Response already handled by respondToUiRequest
      });

      safeSend(clientWs, JSON.stringify({
        type: "ui_request",
        id: requestId,
        method,
        title: req.title,
        message: req.message,
        options: req.options,
        placeholder: req.placeholder,
        prefill: req.prefill,
        notifyType: req.notifyType,
        statusKey: req.statusKey,
        statusText: req.statusText,
        widgetKey: req.widgetKey,
        widgetLines: req.widgetLines,
        widgetPlacement: req.widgetPlacement,
        timeout: req.timeout,
      }));
      return;
    }

    // Persist messages on agent_end
    if (event.type === "agent_end") {
      const session = clientSessions.get(clientWs);
      if (session && (event as Record<string, unknown>).messages) {
        const messages = (event as Record<string, unknown>).messages as Array<Record<string, unknown>>;
        try {
          await sessionStore.saveMessages(session.sessionId,
            messages.map((m) => ({
              role: (m.role as "user" | "assistant" | "system") || "assistant",
              content: (m.content as string) || "",
              timestamp: (m.timestamp as number) || Date.now(),
              is_streaming: false,
            }))
          );
        } catch (dbErr) {
          console.error("[server] Failed to persist messages in DB:", dbErr);
          if (dbReady) {
            safeSend(clientWs, JSON.stringify({
              type: "db_warning",
              message: "Message persistence failed — messages will be lost on reconnect.",
            }));
          }
        }
      }
    }

    safeSend(clientWs, JSON.stringify(event));
  });

  return piClient;
}

// ─── Route handlers ──────────────────────────────────────────────────────────

async function handleClientMessage(clientWs: AuthenticatedWebSocket, raw: string): Promise<void> {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw);
  } catch {
    safeSend(clientWs, JSON.stringify({ type: "error", message: "Invalid JSON" }));
    return;
  }

  // Permission check
  const authUser = clientWs.userData;
  if (!hasPermission(authUser.role, msg.type)) {
    safeSend(clientWs, JSON.stringify({ type: "error", message: "Permission denied: insufficient privileges" }));
    return;
  }

  // Ensure the Pi process is running, but don't await if already running
  // to avoid blocking concurrent messages
  const existing = clientRpcs.get(clientWs);
  if (!existing?.isRunning) {
    await spawnPiForClient(clientWs);
  }
  const pi = clientRpcs.get(clientWs)!;

  const handlerMap: Record<string, () => Promise<void>> = {
    prompt: async () => {
      if (!msg.message || typeof msg.message !== "string" || msg.message.trim() === "") {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "Message is required" }));
        return;
      }
      // prompt: validate message and optional streamingBehavior
      if (msg.streamingBehavior !== undefined && typeof msg.streamingBehavior !== "string") {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "streamingBehavior must be a string" }));
        return;
      }
      try {
        const cmd: RpcCommand = {
          type: "prompt",
          message: msg.message,
        };
        // S-19: Validate images array if provided
        if (msg.images) {
          if (!Array.isArray(msg.images)) {
            safeSend(clientWs, JSON.stringify({ type: "error", message: "Images must be an array" }));
            return;
          }
          // Validate each image element is a non-null object with required fields
          const validImages: Array<{type: string; data: string; mimeType: string}> = [];
          for (const img of msg.images) {
            if (typeof img !== "object" || img === null || Array.isArray(img)) {
              safeSend(clientWs, JSON.stringify({ type: "error", message: "Each image must be an object with type, data, and mimeType" }));
              return;
            }
            if (img.type !== "image" || typeof (img as Record<string, unknown>).data !== "string" || typeof (img as Record<string, unknown>).mimeType !== "string") {
              safeSend(clientWs, JSON.stringify({ type: "error", message: "Each image must have type='image', data (string), and mimeType (string)" }));
              return;
            }
            validImages.push(img as {type: string; data: string; mimeType: string});
          }
          cmd.images = validImages;
        }
        if (msg.streamingBehavior) cmd.streamingBehavior = msg.streamingBehavior;
        await pi.send(cmd);
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // abort: cancel the current stream
    abort: async () => {
      try {
        await pi.send({ type: "abort" });
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // set_model: switch the active model
    set_model: async () => {
      if (!msg.provider || typeof msg.provider !== "string") {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "Provider is required" }));
        return;
      }
      if (!msg.modelId || typeof msg.modelId !== "string") {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "Model ID is required" }));
        return;
      }
      try {
        const resp = await pi.send({
          type: "set_model",
          provider: msg.provider as string,
          modelId: msg.modelId as string,
        });
        safeSend(clientWs, JSON.stringify({ type: "model_changed", data: resp }));
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // set_thinking_level: change the thinking depth (off/low/medium/high)
    set_thinking_level: async () => {
      if (!msg.level || typeof msg.level !== "string") {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "Thinking level is required" }));
        return;
      }
      try {
        await pi.send({
          type: "set_thinking_level",
          level: msg.level as string,
        });
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // get_state: return current session state
    get_state: async () => {
      try {
        const resp = await pi.send({ type: "get_state" });
        safeSend(clientWs, JSON.stringify({ type: "state", data: resp }));
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // get_messages: return conversation messages
    get_messages: async () => {
      try {
        const resp = await pi.send({ type: "get_messages" });
        safeSend(clientWs, JSON.stringify({ type: "messages", data: resp }));
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // get_available_models: list all available models
    get_available_models: async () => {
      try {
        const resp = await pi.send({ type: "get_available_models" });
        safeSend(clientWs, JSON.stringify({ type: "models", data: resp }));
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // new_session: create a fresh conversation
    new_session: async () => {
      try {
        const resp = await pi.send({ type: "new_session" });
        // Register new session in DB
        const newSessionId = (resp as Record<string, unknown>)?.sessionId as string | undefined;
        if (newSessionId) {
          try {
            await sessionStore.registerSession(authUser.id, {
              id: newSessionId,
              user_id: authUser.id,
              name: "Untitled",
              created_at: Date.now(),
            });
            clientSessions.set(clientWs, {
              userId: authUser.id,
              sessionId: newSessionId,
            });
          } catch (dbErr) {
            console.error("[server] Failed to register session in DB:", dbErr);
            if (dbReady) {
              safeSend(clientWs, JSON.stringify({
                type: "db_warning",
                message: "Session registration failed — session will not be persisted.",
              }));
            }
          }
        }
        safeSend(clientWs, JSON.stringify({ type: "session_switched", data: { cancelled: false, ...resp } }));
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // compact: compress conversation history
    compact: async () => {
      // Validate customInstructions if provided
      if (msg.customInstructions !== undefined && typeof msg.customInstructions !== "string") {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "customInstructions must be a string" }));
        return;
      }
      try {
        await pi.send({ type: "compact", customInstructions: msg.customInstructions });
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // get_session_stats: return session statistics
    get_session_stats: async () => {
      try {
        const resp = await pi.send({ type: "get_session_stats" });
        safeSend(clientWs, JSON.stringify({ type: "stats", data: resp }));
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // get_fork_messages: return messages for forking
    get_fork_messages: async () => {
      try {
        const resp = await pi.send({ type: "get_fork_messages" });
        safeSend(clientWs, JSON.stringify({ type: "fork_messages", data: resp }));
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // fork: duplicate a message entry into a new session
    fork: async () => {
      if (!msg.entryId || typeof msg.entryId !== "string") {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "Entry ID is required" }));
        return;
      }
      try {
        const resp = await pi.send({ type: "fork", entryId: msg.entryId as string });
        // Update session tracking
        const newSessionId = (resp as Record<string, unknown>)?.sessionId as string | undefined;
        if (newSessionId) {
          const prevSession = clientSessions.get(clientWs);
          if (prevSession) {
            await sessionStore.closeSession(prevSession.sessionId).catch(() => {});
          }
          try {
            await sessionStore.registerSession(authUser.id, {
              id: newSessionId,
              user_id: authUser.id,
              name: "Untitled",
              created_at: Date.now(),
            });
            clientSessions.set(clientWs, {
              userId: authUser.id,
              sessionId: newSessionId,
            });
          } catch (dbErr) {
            console.error("[server] Failed to register forked session:", dbErr);
            if (dbReady) {
              safeSend(clientWs, JSON.stringify({
                type: "db_warning",
                message: "Forked session registration failed — session will not be persisted.",
              }));
            }
          }
        }
        safeSend(clientWs, JSON.stringify({ type: "session_switched", data: { cancelled: false, ...resp } }));
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // clone: duplicate the current session
    clone: async () => {
      try {
        const resp = await pi.send({ type: "clone" });
        // Update session tracking
        const newSessionId = (resp as Record<string, unknown>)?.sessionId as string | undefined;
        if (newSessionId) {
          const prevSession = clientSessions.get(clientWs);
          if (prevSession) {
            await sessionStore.closeSession(prevSession.sessionId).catch(() => {});
          }
          try {
            await sessionStore.registerSession(authUser.id, {
              id: newSessionId,
              user_id: authUser.id,
              name: "Untitled",
              created_at: Date.now(),
            });
            clientSessions.set(clientWs, {
              userId: authUser.id,
              sessionId: newSessionId,
            });
          } catch (dbErr) {
            console.error("[server] Failed to register cloned session:", dbErr);
            if (dbReady) {
              safeSend(clientWs, JSON.stringify({
                type: "db_warning",
                message: "Cloned session registration failed — session will not be persisted.",
              }));
            }
          }
        }
        safeSend(clientWs, JSON.stringify({ type: "session_switched", data: { cancelled: false, ...resp } }));
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // switch_session: switch to an existing session
    switch_session: async () => {
      if (!msg.sessionPath || typeof msg.sessionPath !== "string") {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "Session path is required" }));
        return;
      }
      // S-21: Validate session path format (prevent path traversal)
      const sessionPath = msg.sessionPath as string;
      if (sessionPath.includes("..")) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "Invalid session path" }));
        return;
      }
      try {
        const resp = await pi.send({
          type: "switch_session",
          sessionPath,
        });
        // Update session tracking in DB
        const newSessionId = (resp as Record<string, unknown>)?.sessionId as string | undefined;
        if (newSessionId) {
          // Close the previous session if any
          const prevSession = clientSessions.get(clientWs);
          if (prevSession) {
            await sessionStore.closeSession(prevSession.sessionId).catch(() => {
              // Ignore errors on close
            });
          }
          try {
            await sessionStore.updateSession(newSessionId, { status: "active" });
            clientSessions.set(clientWs, {
              userId: authUser.id,
              sessionId: newSessionId,
            });
          } catch (dbErr) {
            console.error("[server] Failed to update session in DB:", dbErr);
            if (dbReady) {
              safeSend(clientWs, JSON.stringify({
                type: "db_warning",
                message: "Session update failed — changes will not be persisted.",
              }));
            }
          }
        }
        safeSend(clientWs, JSON.stringify({ type: "session_switched", data: { cancelled: false, ...resp } }));
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // set_session_name: rename the current session
    set_session_name: async () => {
      if (!msg.name || typeof msg.name !== "string" || msg.name.trim().length === 0) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "Session name is required" }));
        return;
      }
      try {
        await pi.send({
          type: "set_session_name",
          name: msg.name as string,
        });
        // Update session name in DB
        const session = clientSessions.get(clientWs);
        if (session) {
          await sessionStore.updateSession(session.sessionId, { name: msg.name as string }).catch(() => {
            // Ignore DB errors
          });
        }
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // get_commands: list available slash commands
    get_commands: async () => {
      try {
        const resp = await pi.send({ type: "get_commands" });
        safeSend(clientWs, JSON.stringify({ type: "commands", data: resp }));
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // steer: send a steering directive
    steer: async () => {
      if (!msg.message || typeof msg.message !== "string" || msg.message.trim() === "") {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "Message is required" }));
        return;
      }
      try {
        const cmd: RpcCommand = {
          type: "steer",
          message: msg.message,
        };
        if (msg.images) cmd.images = msg.images;
        await pi.send(cmd);
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // follow_up: send a follow-up message
    follow_up: async () => {
      if (!msg.message || typeof msg.message !== "string" || msg.message.trim() === "") {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "Message is required" }));
        return;
      }
      try {
        const cmd: RpcCommand = {
          type: "follow_up",
          message: msg.message,
        };
        if (msg.images) cmd.images = msg.images;
        await pi.send(cmd);
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // bash: execute a shell command
    bash: async () => {
      if (!msg.command || typeof msg.command !== "string") {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "Command is required" }));
        return;
      }
      try {
        const resp = await pi.send({
          type: "bash",
          command: msg.command as string,
        });
        safeSend(clientWs, JSON.stringify({ type: "bash_result", data: resp }));
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // set_steering_mode: configure steering behavior mode
    set_steering_mode: async () => {
      if (!msg.mode || typeof msg.mode !== "string") {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "Mode is required" }));
        return;
      }
      try {
        await pi.send({
          type: "set_steering_mode",
          mode: msg.mode as string,
        });
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // set_follow_up_mode: configure follow-up behavior mode
    set_follow_up_mode: async () => {
      if (!msg.mode || typeof msg.mode !== "string") {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "Mode is required" }));
        return;
      }
      try {
        await pi.send({
          type: "set_follow_up_mode",
          mode: msg.mode as string,
        });
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // set_auto_compaction: toggle automatic history compaction
    set_auto_compaction: async () => {
      if (msg.enabled === undefined || typeof msg.enabled !== "boolean") {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "Enabled flag is required" }));
        return;
      }
      try {
        await pi.send({
          type: "set_auto_compaction",
          enabled: msg.enabled as boolean,
        });
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // set_auto_retry: toggle automatic retry on failure
    set_auto_retry: async () => {
      if (msg.enabled === undefined || typeof msg.enabled !== "boolean") {
        safeSend(clientWs, JSON.stringify({ type: "error", message: "Enabled flag is required" }));
        return;
      }
      try {
        await pi.send({
          type: "set_auto_retry",
          enabled: msg.enabled as boolean,
        });
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // cycle_model: rotate to the next available model
    cycle_model: async () => {
      try {
        const resp = await pi.send({ type: "cycle_model" });
        safeSend(clientWs, JSON.stringify({ type: "model_changed", data: resp }));
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // cycle_thinking_level: rotate to the next thinking level
    cycle_thinking_level: async () => {
      try {
        const resp = await pi.send({ type: "cycle_thinking_level" });
        safeSend(clientWs, JSON.stringify({ type: "thinking_level_changed", data: resp }));
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },

    // get_last_assistant_text: retrieve the last assistant response text
    get_last_assistant_text: async () => {
      try {
        const resp = await pi.send({ type: "get_last_assistant_text" });
        safeSend(clientWs, JSON.stringify({ type: "last_assistant_text", data: resp }));
      } catch (err) {
        safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
      }
    },
  };

  const handler = handlerMap[msg.type];
  if (!handler) {
    safeSend(clientWs, JSON.stringify({ type: "error", message: `Unknown command: ${msg.type}` }));
    return;
  }

  try {
    await handler();
  } catch (err) {
    safeSend(clientWs, JSON.stringify({ type: "error", message: (err as Error).message }));
  }
}

// ─── Auth middleware for WebSocket ──────────────────────────────────────────

interface AuthenticatedWebSocket extends WebSocket {
  userData: JwtPayload;
}

function authenticateWebSocket(ws: WebSocket, req: IncomingMessage): boolean {
  if (!authEnabled) return true;

  // Parse URL from request to get query params
  // S-27: Guard against URL parsing errors
  const urlStr = req.url || "/";
  let url: URL;
  try {
    url = new URL(
      urlStr,
      `http://${process.env.HOST || "localhost"}:${wsPort}`
    );
  } catch {
    safeSend(ws, JSON.stringify({ type: "auth_error", message: "Invalid request URL" }));
    ws.close(1008, "Invalid request URL");
    return false;
  }
  const token = url.searchParams.get("token");

  if (!token) {
    safeSend(ws, JSON.stringify({ type: "auth_required" }));
    ws.close(1008, "Authentication required");
    return false;
  }

  const payload = verifyToken(token);
  if (!payload) {
    safeSend(ws, JSON.stringify({ type: "auth_error", message: "Invalid or expired token" }));
    ws.close(1008, "Invalid or expired token");
    return false;
  }

  // Attach user data to WebSocket
  (ws as AuthenticatedWebSocket).userData = payload;
  return true;
}

// ─── Connection lifecycle ────────────────────────────────────────────────────

wss.on("connection", (ws, req) => {
  // Authenticate before accepting connection
  if (!authenticateWebSocket(ws, req)) {
    console.log(`[ws] Client rejected (auth failed)`);
    return;
  }

  const authUser = (ws as AuthenticatedWebSocket).userData;
  console.log(`[ws] Client connected: ${authUser.username} (${authUser.role}) (${wss.clients.size} total)`);

  ws.on("message", (data) => {
    handleClientMessage(ws as AuthenticatedWebSocket, data.toString());
  });

  ws.on("close", () => {
    const clientPi = clientRpcs.get(ws);
    if (clientPi) {
      clientPi.stop();
      clientRpcs.delete(ws);
    }
    // Clean up session tracking
    const session = clientSessions.get(ws);
    if (session) {
      // Close the session in DB
      sessionStore.closeSession(session.sessionId).catch(() => {
        // Ignore errors on close
      });
      clientSessions.delete(ws);
    }
    console.log(`[ws] Client disconnected (${wss.clients.size} total)`);
  });

  ws.on("error", (err) => {
    console.error(`[ws] Error: ${err.message}`);
  });

  // Send connection ack with user info
  safeSend(ws, JSON.stringify({ type: "connected", user: authUser }));
});

// ─── Database readiness flag ───────────────────────────────────────────────
let dbReady = false;

initDatabase().then(() => {
  dbReady = true;
  // Initialize user store after DB is ready
  userStore.load();
  userStore.seedDefaultAdmin().catch((err) => {
    console.error("[server] Failed to seed default admin:", err);
  });
}).catch((err) => {
  dbReady = false;
  console.error("[server] Failed to initialize database:", err);
  console.error("[server] The server will continue, but database operations will fail.");
});

// ─── Initialize user store ─────────────────────────────────────────────────

// (load + seedDefaultAdmin are called after initDatabase above)

// ─── Start ───────────────────────────────────────────────────────────────────

server.listen(wsPort, () => {
  console.log(`[server] ${useHttps ? "HTTPS" : "HTTP"} on :${wsPort}`);
  console.log(`[server] WebSocket on :${wsPort} (same port)`);
  console.log(`[server] pi provider: ${piProvider || "default"}`);
  console.log(`[server] pi model: ${piModel || "default"}`);
  console.log(`[server] auth: ${authEnabled ? "enabled" : "disabled"}`);
  if (useHttps && !httpsCertPath) {
    console.log("[server] Using self-signed certificate. Trust .certs/cert.pem in your browser.");
  }
  if (authEnabled) {
    console.log(`[server] Default admin: ${process.env.DEFAULT_ADMIN_USERNAME || "admin"}`);
  }
});

process.on("SIGINT", async () => {
  console.log("\n[server] Shutting down...");
  clientRpcs.forEach((pi) => {
    pi.clearPendingResponses();
    pi.stop();
  });
  // Also clear the global rpc's pending responses
  rpc.clearPendingResponses();
  wss.close();
  server.close();
  await closeDatabase();
  process.exit(0);
});
