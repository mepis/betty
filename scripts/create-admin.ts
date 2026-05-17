#!/usr/bin/env tsx
/**
 * create-admin — Standalone script to create (or reset) the default admin user.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts
 *
 * Environment variables (defaults shown):
 *   DEFAULT_ADMIN_USERNAME  admin
 *   DEFAULT_ADMIN_PASSWORD  (auto-generated if not set)
 *   DB_HOST                 localhost
 *   DB_PORT                 3306
 *   DB_USER                 root
 *   DB_PASSWORD
 *   DB_NAME                 betty
 *
 * This script:
 *   1. Reads DB connection info from environment (or .env)
 *   2. Initializes the database schema if needed
 *   3. Checks if an admin user already exists
 *   4. Creates a default admin user (or resets the password if one exists)
 */

import dotenv from "dotenv";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import * as bcrypt from "bcrypt";
import mysql from "mysql2/promise";

// ─── Load .env ──────────────────────────────────────────────────────────────

const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// ─── Configuration ──────────────────────────────────────────────────────────

const ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD;
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = parseInt(process.env.DB_PORT || "3306", 10);
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "betty";
const BCRYPT_COST = parseInt(process.env.BCRYPT_COST || "12", 10) || 12;

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(msg: string): void {
  console.log(`[create-admin] ${msg}`);
}

function warn(msg: string): void {
  console.warn(`[create-admin] ${msg}`);
}

function error(msg: string): void {
  console.error(`[create-admin] ${msg}`);
}

/** Create a pool without specifying a database (for DB creation). */
function createAdminPool(): mysql.Pool {
  return mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    charset: "utf8mb4",
  });
}

/** Create a pool for the application database. */
function createAppPool(): mysql.Pool {
  return mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    idleTimeout: 60000,
    connectionLimit: 5,
    charset: "utf8mb4",
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  log("Starting admin user creation...");

  // 1. Ensure the database exists and schema is initialized
  log(`Connecting to MySQL at ${DB_HOST}:${DB_PORT} as ${DB_USER}...`);
  const adminPool = createAdminPool();
  try {
    await adminPool.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    log(`Database "${DB_NAME}" is ready.`);
  } finally {
    await adminPool.end();
  }

  // 2. Connect to the app database
  const pool = createAppPool();
  try {
    // Verify connectivity
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    log("Connected to database.");

    // 3. Check if admin user already exists
    const [rows] = await pool.execute(
      "SELECT id, username, role FROM users WHERE username = ?",
      [ADMIN_USERNAME]
    ) as [Array<{ id: string; username: string; role: string }>, unknown];

    if (rows.length > 0) {
      const existing = rows[0];
      warn(`Admin user "${ADMIN_USERNAME}" already exists (id: ${existing.id}, role: ${existing.role}).`);

      if (ADMIN_PASSWORD) {
        // Reset the password
        const hashed = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_COST);
        await pool.execute(
          "UPDATE users SET hashed_password = ? WHERE username = ?",
          [hashed, ADMIN_USERNAME]
        );
        log(`Password for "${ADMIN_USERNAME}" has been reset.`);
      } else {
        log(`No new password provided. Skipping password reset.`);
      }
      log(`Admin user "${ADMIN_USERNAME}" is ready.`);
      return;
    }

    // 4. Generate credentials
    const username = ADMIN_USERNAME;
    const password = ADMIN_PASSWORD || (randomUUID() + randomUUID());

    // 5. Hash password and create user
    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);
    const id = randomUUID();
    const createdAt = Date.now();

    await pool.execute(
      "INSERT INTO users (id, username, hashed_password, role, created_at) VALUES (?, ?, ?, 'admin', ?)",
      [id, username, hashedPassword, createdAt]
    );

    // 6. Report result
    log(`Default admin user created successfully!`);
    log(`  Username:  ${username}`);
    log(`  Password:  ${password}`);
    log(`  Role:      admin`);

    if (!ADMIN_PASSWORD) {
      warn("Auto-generated credentials — save them securely!");
      warn("Set DEFAULT_ADMIN_PASSWORD in your .env file to use a known password.");
    } else {
      warn(`Admin user "${username}" — change the password via API immediately.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  error(`Fatal error: ${err.message}`);
  if (err.stack) error(err.stack);
  process.exit(1);
});
