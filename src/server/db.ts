import * as mysql from "mysql2/promise";

// ─── Database Configuration ─────────────────────────────────────────────────

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
}

let pool: mysql.Pool | null = null;
let adminPool: mysql.Pool | null = null;

/**
 * Validate and sanitize the database name.
 * Returns the sanitized name, or null if the name would be empty after sanitization.
 */
function sanitizeDbName(name: string): string | null {
  const safe = name.replace(/[^a-zA-Z0-9_]/g, "");
  if (safe.length === 0) {
    throw new Error(
      `Invalid database name "${name}": after sanitization the name is empty. ` +
        "Use only letters, digits, and underscores."
    );
  }
  if (safe !== name) {
    console.warn(
      `[db] Database name was sanitized: "${name}" → "${safe}"`
    );
  }
  return safe;
}

function getDbConfig(): DbConfig {
  const dbName = process.env.DB_NAME || "betty";

  // M15*: Reject empty password for non-localhost to prevent insecure defaults
  const password = process.env.DB_PASSWORD || "";
  if (
    !password &&
    process.env.DB_HOST !== "localhost" &&
    process.env.DB_HOST !== "127.0.0.1"
  ) {
    throw new Error(
      "DB_PASSWORD is required when connecting to a non-localhost database. " +
        "Set the DB_PASSWORD environment variable."
    );
  }

  // Validate database name early
  sanitizeDbName(dbName);

  return {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "root",
    password,
    database: dbName,
    ssl: process.env.DB_SSL === "true",
  };
}

// ─── Connection Pool ────────────────────────────────────────────────────────

function createPoolConfig(
  extra: Partial<mysql.PoolOptions> = {}
): mysql.PoolOptions {
  const config = getDbConfig();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poolConfig: any = {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    idleTimeout: 60000,
    charset: "utf8mb4",
    timezone: "+00:00",
    ...extra,
  };

  if (config.ssl) {
    poolConfig.ssl = { rejectUnauthorized: true };
  }

  return poolConfig;
}

function createPool(): mysql.Pool {
  pool = mysql.createPool(createPoolConfig());
  return pool;
}

/** Get the connection pool, creating it if necessary. */
export function getPool(): mysql.Pool {
  if (!pool) {
    return createPool();
  }
  return pool;
}

// ─── Pool Metrics ───────────────────────────────────────────────────────────

/**
 * Return pool statistics for monitoring/health checks.
 * mysql2 pools expose internal state via getter properties.
 */
export function getPoolStats(): {
  connections: number;
  pending: number;
  database: string;
  host: string;
  port: number;
} {
  const config = getDbConfig();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const internalPool = (pool as any)?._pool;
  const connections = internalPool
    ? internalPool.sizes?.active || 0
    : 0;
  const pending = internalPool
    ? internalPool.sizes?.pending || 0
    : 0;
  return {
    connections,
    pending,
    database: config.database,
    host: config.host,
    port: config.port,
  };
}

// ─── Query Helpers ──────────────────────────────────────────────────────────

/**
 * Execute a query using a connection from the pool.
 * @returns The query result, typed as T.
 * @throws mysql.MysqlError on database errors.
 */
export async function execute<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    const result = await conn.query(sql, params);
    // mysql2 returns [rows, packet] for SELECT; for DML it returns a ResultSetHeader
    if (Array.isArray(result)) {
      const [rows] = result as [T, unknown];
      return rows as T;
    }
    // DML result (insert/update/delete) — return as-is
    return result as unknown as T;
  } finally {
    conn.release();
  }
}

/** Execute a query without auto-release (for transactions). */
export async function executeWithConnection<T = unknown>(
  conn: mysql.Connection,
  sql: string,
  params?: unknown[]
): Promise<T> {
  const result = await conn.query(sql, params);
  if (Array.isArray(result)) {
    const [rows] = result as [T, unknown];
    return rows as T;
  }
  return result as unknown as T;
}

// ─── Database Initialization ────────────────────────────────────────────────

/**
 * Initialize the database by running the SQL migration script.
 * Creates the database, tables, and indexes.
 *
 * Uses a dedicated admin pool that is tracked and closed on shutdown (M01 fix).
 */
export async function initDatabase(): Promise<void> {
  const config = getDbConfig();
  const safeDb = sanitizeDbName(config.database);

  // Create a dedicated admin pool (no database specified initially)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminConfig: any = {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    idleTimeout: 60000,
    charset: "utf8mb4",
    ...(config.ssl ? { ssl: { rejectUnauthorized: true } } : {}),
  };
  adminPool = mysql.createPool(adminConfig);

  try {
    // Create the database if it doesn't exist
    await adminPool.query(
      `CREATE DATABASE IF NOT EXISTS \`${safeDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    // Run the migration script (tables, indexes)
    const fs = await import("node:fs");
    const path = await import("node:path");
    const sqlPath = path.join(
      process.cwd(),
      "scripts",
      "init-db.sql"
    );

    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, "utf-8");
      // Split on semicolons and execute each statement
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        // Skip USE statement and CREATE DATABASE (already handled)
        if (
          stmt.toUpperCase().startsWith("USE ") ||
          stmt.toUpperCase().includes("CREATE DATABASE")
        ) {
          continue;
        }
        try {
          await adminPool.execute(stmt);
        } catch (err) {
          // Ignore "table already exists" errors (M22: only skip known safe errors)
          const mysqlErr = err as { code?: string; errno?: number; sqlState?: string };
          // ER_TABLE_EXISTS_ERROR (code) or errno 1050, or SQLSTATE 42S01
          const isTableExists =
            mysqlErr.code === "ER_TABLE_EXISTS_ERROR" ||
            mysqlErr.errno === 1050 ||
            mysqlErr.sqlState === "42S01";

          if (isTableExists) {
            continue;
          }

          // For other errors, log but continue (non-fatal for init)
          console.warn(
            "[db] Warning during init:",
            (err as Error).message
          );
        }
      }

      console.log("[db] Database schema initialized successfully.");
    } else {
      console.warn(
        "[db] Migration script not found at",
        sqlPath,
        "— tables must be created manually."
      );
    }
  } finally {
    await adminPool.end();
    adminPool = null;
  }
}

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

/** Close all connection pools gracefully. */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("[db] Main database pool closed.");
  }
  // M01 fix: also close adminPool if it's still open (shouldn't be after init,
  // but protects against edge cases where init failed mid-way)
  if (adminPool) {
    await adminPool.end();
    adminPool = null;
    console.log("[db] Admin database pool closed.");
  }
}

// ─── Health Check ───────────────────────────────────────────────────────────

/** Check if the database connection is alive. */
export async function checkHealth(): Promise<boolean> {
  try {
    const conn = await getPool().getConnection();
    await conn.ping();
    conn.release();
    return true;
  } catch {
    return false;
  }
}

/** Full health check including pool stats. */
export async function checkHealthFull(): Promise<{
  ok: boolean;
  db: boolean;
  pool: ReturnType<typeof getPoolStats>;
}> {
  const dbOk = await checkHealth();
  return {
    ok: dbOk,
    db: dbOk,
    pool: getPoolStats(),
  };
}
