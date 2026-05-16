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
import { WebSocketServer, type WebSocket } from "ws";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import selfsigned from "selfsigned";
import { userStore } from "./src/server/userStore";
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
  ".js.map": "application/json",
  ".svg+xml": "image/svg+xml",
};

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

  const ext = path.extname(filePath).toLowerCase();
  const mime = getMime(ext);

  res.writeHead(200, {
    "Content-Type": mime,
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  fs.createReadStream(fullPath).pipe(res);
}

function parseBody(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
      resolve(null);
      return;
    }
    const chunks: Buffer[] = [];
    let totalSize = 0;
    const maxSize = 1024 * 1024; // 1MB limit
    req.on("data", (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > maxSize) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Request entity too large" }));
        resolve(null);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
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
    req.on("error", () => resolve(null));
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
    if (!body || !body.username || !body.password) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Username and password are required" }));
      return true;
    }
    const user = await userStore.authenticate(body.username as string, body.password as string);
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
    if (!body || !body.username || !body.password) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Username and password are required" }));
      return true;
    }
    const role = (body.role as UserRole) || "user";
    if (!["admin", "user", "viewer"].includes(role)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid role" }));
      return true;
    }
    try {
      const user = await userStore.createUser(body.username as string, body.password as string, role);
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
    const deleted = userStore.deleteUser(id);
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

function requestHandler(req: IncomingMessage, res: ServerResponse): void {
  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      wsClients: wss.clients.size,
      https: useHttps,
      auth: authEnabled,
    }));
    return;
  }

  // REST API routes
  if (req.url?.startsWith("/api/")) {
    parseBody(req).then((body) => {
      if (!handleApiRoute(req, res, body)) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      }
    });
    return;
  }

  // Serve static files from dist/ if available (production mode)
  const distDir = path.join(__dirname, "dist");
  if (fs.existsSync(distDir)) {
    serveStaticFile(req, res, distDir);
    return;
  }

  // Dev mode: informative message
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
  private isRunning = false;

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
        this.isRunning = false;
        if (code !== 0) {
          reject(new Error(`pi process exited with code ${code}`));
        }
      });
      this.isRunning = true;
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

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }

      const msg = parsed as Record<string, unknown>;
      const eventType = msg.type as string;

      if (eventType === "response") {
        const resp = msg as RpcResponse;
        if (resp.id && this.pendingResponses.has(resp.id)) {
          const resolve = this.pendingResponses.get(resp.id)!;
          this.pendingResponses.delete(resp.id);
          resolve(resp.data ?? msg);
        }
      } else {
        // It's an event
        this.eventListeners.forEach((fn) => fn(msg as RpcEvent));
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
    const msg = JSON.stringify({ type: "extension_ui_response", id, ...response }) + "\n";
    this.proc.stdin.write(msg);
  }

  get isRunning(): boolean {
    return this.isRunning;
  }

  stop(): void {
    this.proc?.kill("SIGINT");
    this.isRunning = false;
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

async function spawnPiForClient(clientWs: WebSocket): Promise<PiRpcClient> {
  const existing = clientRpcs.get(clientWs);
  if (existing?.isRunning) return existing;

  // Stop old one if exists
  existing?.stop();

  const piClient = new PiRpcClient();
  await piClient.start({
    provider: piProvider,
    model: piModel,
    noSession: piNoSession,
    sessionDir: piSessionDir,
    thinkingLevel: piThinkingLevel,
    apikey: piApikey,
    verbose: piVerbose,
  });

  clientRpcs.set(clientWs, piClient);

  // Forward events from this client's pi to its WebSocket
  piClient.onEvent((event) => {
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

      clientWs.send(
        JSON.stringify({
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
        })
      );
      return;
    }

    clientWs.send(JSON.stringify(event));
  });

  return piClient;
}

// ─── Route handlers ──────────────────────────────────────────────────────────

async function handleClientMessage(clientWs: AuthenticatedWebSocket, raw: string): Promise<void> {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw);
  } catch {
    clientWs.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
    return;
  }

  // Permission check
  const authUser = clientWs.userData;
  if (!hasPermission(authUser.role, msg.type)) {
    clientWs.send(JSON.stringify({ type: "error", message: "Permission denied: insufficient privileges" }));
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
      const cmd: RpcCommand = {
        type: "prompt",
        message: msg.message as string,
      };
      if (msg.images) cmd.images = msg.images;
      if (msg.streamingBehavior) cmd.streamingBehavior = msg.streamingBehavior;
      await pi.send(cmd);
    },

    abort: async () => {
      await pi.send({ type: "abort" });
    },

    set_model: async () => {
      const resp = await pi.send({
        type: "set_model",
        provider: msg.provider as string,
        modelId: msg.modelId as string,
      });
      clientWs.send(JSON.stringify({ type: "model_changed", data: resp }));
    },

    set_thinking_level: async () => {
      await pi.send({
        type: "set_thinking_level",
        level: msg.level as string,
      });
    },

    get_state: async () => {
      const resp = await pi.send({ type: "get_state" });
      clientWs.send(JSON.stringify({ type: "state", data: resp }));
    },

    get_messages: async () => {
      const resp = await pi.send({ type: "get_messages" });
      clientWs.send(JSON.stringify({ type: "messages", data: resp }));
    },

    get_available_models: async () => {
      const resp = await pi.send({ type: "get_available_models" });
      clientWs.send(JSON.stringify({ type: "models", data: resp }));
    },

    new_session: async () => {
      const resp = await pi.send({ type: "new_session" });
      clientWs.send(JSON.stringify({ type: "session_switched", data: { cancelled: false, ...resp } }));
    },

    compact: async () => {
      await pi.send({ type: "compact", customInstructions: msg.customInstructions });
    },

    get_session_stats: async () => {
      const resp = await pi.send({ type: "get_session_stats" });
      clientWs.send(JSON.stringify({ type: "stats", data: resp }));
    },

    get_fork_messages: async () => {
      const resp = await pi.send({ type: "get_fork_messages" });
      clientWs.send(JSON.stringify({ type: "fork_messages", data: resp }));
    },

    fork: async () => {
      const resp = await pi.send({ type: "fork", entryId: msg.entryId });
      clientWs.send(JSON.stringify({ type: "session_switched", data: { cancelled: false, ...resp } }));
    },

    clone: async () => {
      const resp = await pi.send({ type: "clone" });
      clientWs.send(JSON.stringify({ type: "session_switched", data: { cancelled: false, ...resp } }));
    },

    switch_session: async () => {
      const resp = await pi.send({
        type: "switch_session",
        sessionPath: msg.sessionPath,
      });
      clientWs.send(JSON.stringify({ type: "session_switched", data: { cancelled: false, ...resp } }));
    },

    set_session_name: async () => {
      await pi.send({
        type: "set_session_name",
        name: msg.name as string,
      });
    },

    get_commands: async () => {
      const resp = await pi.send({ type: "get_commands" });
      clientWs.send(JSON.stringify({ type: "commands", data: resp }));
    },

    steer: async () => {
      const cmd: RpcCommand = {
        type: "steer",
        message: msg.message as string,
      };
      if (msg.images) cmd.images = msg.images;
      await pi.send(cmd);
    },

    follow_up: async () => {
      const cmd: RpcCommand = {
        type: "follow_up",
        message: msg.message as string,
      };
      if (msg.images) cmd.images = msg.images;
      await pi.send(cmd);
    },

    bash: async () => {
      const resp = await pi.send({
        type: "bash",
        command: msg.command as string,
      });
      clientWs.send(
        JSON.stringify({ type: "bash_result", data: resp })
      );
    },

    set_steering_mode: async () => {
      await pi.send({
        type: "set_steering_mode",
        mode: msg.mode as string,
      });
    },

    set_follow_up_mode: async () => {
      await pi.send({
        type: "set_follow_up_mode",
        mode: msg.mode as string,
      });
    },

    set_auto_compaction: async () => {
      await pi.send({
        type: "set_auto_compaction",
        enabled: msg.enabled as boolean,
      });
    },

    set_auto_retry: async () => {
      await pi.send({
        type: "set_auto_retry",
        enabled: msg.enabled as boolean,
      });
    },

    cycle_model: async () => {
      const resp = await pi.send({ type: "cycle_model" });
      clientWs.send(JSON.stringify({ type: "model_changed", data: resp }));
    },

    cycle_thinking_level: async () => {
      const resp = await pi.send({ type: "cycle_thinking_level" });
      clientWs.send(JSON.stringify({ type: "thinking_level_changed", data: resp }));
    },

    get_last_assistant_text: async () => {
      const resp = await pi.send({ type: "get_last_assistant_text" });
      clientWs.send(JSON.stringify({ type: "last_assistant_text", data: resp }));
    },
  };

  const handler = handlerMap[msg.type];
  if (!handler) {
    clientWs.send(JSON.stringify({ type: "error", message: `Unknown command: ${msg.type}` }));
    return;
  }

  try {
    await handler();
  } catch (err) {
    clientWs.send(JSON.stringify({ type: "error", message: (err as Error).message }));
  }
}

// ─── Auth middleware for WebSocket ──────────────────────────────────────────

interface AuthenticatedWebSocket extends WebSocket {
  userData: JwtPayload;
}

function authenticateWebSocket(ws: WebSocket): boolean {
  if (!authEnabled) return true;

  // Parse URL to get query params
  const url = new URL(
    ws.url || "/",
    `http://${process.env.HOST || "localhost"}:${wsPort}`
  );
  const token = url.searchParams.get("token");

  if (!token) {
    ws.send(JSON.stringify({ type: "auth_required" }));
    ws.close(1008, "Authentication required");
    return false;
  }

  const payload = verifyToken(token);
  if (!payload) {
    ws.send(JSON.stringify({ type: "auth_error", message: "Invalid or expired token" }));
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
  if (!authenticateWebSocket(ws)) {
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
    console.log(`[ws] Client disconnected (${wss.clients.size} total)`);
  });

  ws.on("error", (err) => {
    console.error(`[ws] Error: ${err.message}`);
  });

  // Send connection ack with user info
  ws.send(JSON.stringify({ type: "connected", user: authUser }));
});

// ─── Initialize user store ─────────────────────────────────────────────────

userStore.load();
userStore.seedDefaultAdmin().catch((err) => {
  console.error("[server] Failed to seed default admin:", err);
});

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

process.on("SIGINT", () => {
  console.log("\n[server] Shutting down...");
  clientRpcs.forEach((pi) => pi.stop());
  wss.close();
  server.close();
  process.exit(0);
});
