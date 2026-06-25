/**
 * Unified database abstraction layer for Betty.
 * Three-tier fallback: MySQL (primary) → SQLite (fallback) → JSON files (last resort).
 *
 * Usage:
 *   import db from './db/db.js';
 *   await db.init();
 *   const users = await db.jsonAll('SELECT * FROM users ORDER BY username');
 *   await db.run('INSERT INTO users (id, username, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', params);
 *   await db.close();
 */
import mysql from "mysql2/promise";
import Database from "better-sqlite3";
import fs from "fs";
import { join } from "path";
import os from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BETTY_DIR = join(os.homedir(), ".betty");

// Import JSON fallback store
import * as jsonStore from "./json-store.js";

// Read schema file
const schemaPath = join(__dirname, "schema.sql");
const schemaSQL = fs.readFileSync(schemaPath, "utf-8");

// Configuration
const DB_HOST = process.env.DB_HOST || "";
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 3306;
const DB_USER = process.env.DB_USER || "betty";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "betty";
const DB_POOL_SIZE = parseInt(process.env.DB_POOL_SIZE, 10) || 10;
const DB_SQLITE_PATH = process.env.DB_SQLITE_PATH || join(BETTY_DIR, "betty.db");

// State
let pool = null;
let sqliteDb = null;
let activeBackend = null; // 'mysql' | 'sqlite' | 'json' | null
let initialized = false;

// ============================================
// MySQL Backend
// ============================================

async function mysqlInit() {
  if (!DB_HOST) return false;
  try {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: DB_POOL_SIZE,
      queueLimit: 0,
      connectTimeout: 10000,
      charset: "utf8mb4",
    });

    // Test connection
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();

    // Apply schema
    await applySchema(pool, "mysql");

    activeBackend = "mysql";
    console.log(`[db] Connected to MySQL (${DB_HOST}:${DB_PORT}/${DB_NAME})`);
    return true;
  } catch (err) {
    console.warn(`[db] MySQL connection failed: ${err.message}`);
    if (pool) {
      try { await pool.end(); } catch (_) {}
      pool = null;
    }
    return false;
  }
}

async function mysqlQuery(sql, params = []) {
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.execute(sql, params);
    return result;
  } finally {
    conn.release();
  }
}

async function mysqlGet(sql, params = []) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(sql, params);
    return rows.length > 0 ? rows[0] : null;
  } finally {
    conn.release();
  }
}

async function mysqlAll(sql, params = []) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(sql, params);
    return rows;
  } finally {
    conn.release();
  }
}

async function mysqlRun(sql, params = []) {
  const conn = await pool.getConnection();
  try {
    const result = await conn.execute(sql, params);
    return {
      affectedRows: result.affectedRows,
      lastId: result.insertId || null,
    };
  } finally {
    conn.release();
  }
}

async function mysqlClose() {
  if (pool) {
    await pool.end();
    pool = null;
    activeBackend = null;
    console.log("[db] MySQL connection closed");
  }
}

// ============================================
// SQLite Backend
// ============================================

function sqliteInit() {
  try {
    const sqliteDir = dirname(DB_SQLITE_PATH);
    if (!fs.existsSync(sqliteDir)) {
      fs.mkdirSync(sqliteDir, { recursive: true });
    }
    sqliteDb = new Database(DB_SQLITE_PATH);
    sqliteDb.pragma("journal_mode = WAL");
    sqliteDb.pragma("foreign_keys = ON");

    // Apply schema
    applySchemaSync(sqliteDb, "sqlite");

    activeBackend = "sqlite";
    console.log(`[db] Connected to SQLite (${DB_SQLITE_PATH})`);
    return true;
  } catch (err) {
    console.warn(`[db] SQLite connection failed: ${err.message}`);
    sqliteDb = null;
    return false;
  }
}

function sqliteQuery(sql, params = []) {
  try {
    const stmt = sqliteDb.prepare(sql);
    return stmt.run(...params);
  } catch (err) {
    throw new Error(`[db][sqlite] Query failed: ${err.message}`);
  }
}

function sqliteGet(sql, params = []) {
  try {
    const stmt = sqliteDb.prepare(sql);
    const row = stmt.get(...params);
    return row || null;
  } catch (err) {
    throw new Error(`[db][sqlite] Get failed: ${err.message}`);
  }
}

function sqliteAll(sql, params = []) {
  try {
    const stmt = sqliteDb.prepare(sql);
    return stmt.all(...params);
  } catch (err) {
    throw new Error(`[db][sqlite] All failed: ${err.message}`);
  }
}

function sqliteRun(sql, params = []) {
  try {
    const stmt = sqliteDb.prepare(sql);
    const result = stmt.run(...params);
    return {
      affectedRows: result.changes,
      lastId: result.lastInsertRowid || null,
    };
  } catch (err) {
    throw new Error(`[db][sqlite] Run failed: ${err.message}`);
  }
}

function sqliteClose() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    activeBackend = null;
    console.log("[db] SQLite connection closed");
  }
}

// ============================================
// Schema Application
// ============================================

async function applySchema(connection, type) {
  // SQLite: better-sqlite3's exec can handle the entire schema in one call
  if (type === "sqlite") {
    let sql = schemaSQL.replace(/ENUM\([^)]+\)/g, "TEXT");
    try {
      connection.exec(sql);
    } catch (err) {
      console.warn(`[db] Schema application failed: ${err.message}`);
    }
    return;
  }

  // MySQL: split into individual statements
  const statements = schemaSQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    // Skip pure comment lines
    if (statement.startsWith("--")) continue;
    try {
      await connection.execute(statement);
    } catch (err) {
      console.warn(`[db] Schema statement failed: ${err.message}`);
      // Non-fatal: table may already exist
    }
  }
}

function applySchemaSync(db, type) {
  // SQLite: better-sqlite3's exec can handle the entire schema in one call
  if (type === "sqlite") {
    let sql = schemaSQL.replace(/ENUM\([^)]+\)/g, "TEXT");
    try {
      db.exec(sql);
    } catch (err) {
      console.warn(`[db] Schema application failed: ${err.message}`);
    }
    return;
  }

  const statements = schemaSQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    if (statement.startsWith("--")) continue;
    try {
      db.exec(statement);
    } catch (err) {
      console.warn(`[db] Schema statement failed: ${err.message}`);
    }
  }
}

// ============================================
// JSON Backend (fallback)
// ============================================

async function jsonInit() {
  await jsonStore.init();
  activeBackend = "json";
  console.log("[db] Using JSON file fallback");
  return true;
}

// ============================================
// Unified Interface
// ============================================

/**
 * Initialize the database connection.
 * Tries MySQL first, then SQLite, then JSON files.
 */
async function init() {
  if (initialized) return activeBackend;

  // Try MySQL first
  if (await mysqlInit()) {
    initialized = true;
    return activeBackend;
  }

  // Try SQLite
  if (sqliteInit()) {
    initialized = true;
    return activeBackend;
  }

  // Fall back to JSON files
  await jsonInit();
  initialized = true;
  return activeBackend;
}

/**
 * Execute a generic query.
 */
async function query(sql, params = []) {
  await ensureInitialized();
  switch (activeBackend) {
    case "mysql":
      return mysqlQuery(sql, params);
    case "sqlite":
      return sqliteQuery(sql, params);
    case "json":
      return jsonStore.query(sql, params);
    default:
      throw new Error("[db] No database connection");
  }
}

/**
 * Get a single row.
 */
async function get(sql, params = []) {
  await ensureInitialized();
  switch (activeBackend) {
    case "mysql":
      return mysqlGet(sql, params);
    case "sqlite":
      return sqliteGet(sql, params);
    case "json":
      return jsonStore.get(sql, params);
    default:
      throw new Error("[db] No database connection");
  }
}

/**
 * Get all rows.
 */
async function all(sql, params = []) {
  await ensureInitialized();
  switch (activeBackend) {
    case "mysql":
      return mysqlAll(sql, params);
    case "sqlite":
      return sqliteAll(sql, params);
    case "json":
      return jsonStore.all(sql, params);
    default:
      throw new Error("[db] No database connection");
  }
}

/**
 * Run an insert/update/delete.
 */
async function run(sql, params = []) {
  await ensureInitialized();
  switch (activeBackend) {
    case "mysql":
      return mysqlRun(sql, params);
    case "sqlite":
      return sqliteRun(sql, params);
    case "json":
      return jsonStore.run(sql, params);
    default:
      throw new Error("[db] No database connection");
  }
}

/**
 * Get a single row with JSON parsing (for MySQL JSON columns and SQLite TEXT JSON).
 */
async function jsonGet(sql, params = []) {
  await ensureInitialized();
  const row = await get(sql, params);
  if (!row) return null;
  return parseJsonColumns(row);
}

/**
 * Get all rows with JSON parsing.
 */
async function jsonAll(sql, params = []) {
  await ensureInitialized();
  const rows = await all(sql, params);
  return rows.map(parseJsonColumns);
}

/**
 * Run with JSON serialization.
 */
async function jsonRun(sql, params = [], jsonValue) {
  await ensureInitialized();
  const serialized = JSON.stringify(jsonValue);
  return run(sql, [...params, serialized]);
}

/**
 * Close the database connection.
 */
async function close() {
  if (activeBackend === "mysql") {
    await mysqlClose();
  } else if (activeBackend === "sqlite") {
    sqliteClose();
  }
  initialized = false;
}

/**
 * Get the active backend name.
 */
function getBackend() {
  return activeBackend;
}

/**
 * Ensure the database is initialized.
 */
async function ensureInitialized() {
  if (!initialized) {
    await init();
  }
}

/**
 * Parse JSON columns in a row.
 * Handles MySQL JSON columns (parsed automatically by mysql2)
 * and SQLite TEXT columns (need manual parsing).
 */
function parseJsonColumns(row) {
  if (!row || typeof row !== "object") return row;

  // JSON column names that should be parsed from TEXT in SQLite
  const jsonColumns = [
    "value",      // configs.value
    "live_results",
    "configs_per_run",
    "configs",
    "data",       // profiles.data, service_profiles.data
  ];

  const parsed = { ...row };
  for (const col of jsonColumns) {
    if (col in parsed && typeof parsed[col] === "string") {
      try {
        parsed[col] = JSON.parse(parsed[col]);
      } catch (err) {
        console.warn(`[db] Failed to parse JSON column "${col}": ${err.message}`);
        // Leave as string if parsing fails
      }
    }
  }
  return parsed;
}

// Export the unified interface
export default {
  init,
  query,
  get,
  all,
  run,
  close,
  jsonGet,
  jsonAll,
  jsonRun,
  getBackend,
  ensureInitialized,
  // For migration script access to individual backends
  mysqlInit,
  mysqlQuery,
  mysqlGet,
  mysqlAll,
  mysqlRun,
  mysqlClose,
  sqliteInit,
  sqliteQuery,
  sqliteGet,
  sqliteAll,
  sqliteRun,
  sqliteClose,
  // For direct access to JSON store
  jsonStore,
};
