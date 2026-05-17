import { randomUUID } from "node:crypto";
import * as bcrypt from "bcrypt";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execute } from "./db";

// ─── Types ──────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "user" | "viewer";

export interface User {
  id: string;
  username: string;
  hashedPassword: string;
  role: UserRole;
  createdAt: number;
}

export interface UserPublic {
  id: string;
  username: string;
  role: UserRole;
  createdAt: number;
}

/** Credentials stored on disk for auto-generated admin accounts. */
interface AdminCredentialsFile {
  version: 1;
  username: string;
  password: string;
  createdAt: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_BCRYPT_COST = 12;
const DEFAULT_CREDENTIALS_FILE = ".admin-credentials.json";

/**
 * Determine the bcrypt hashing cost factor.
 * Reads BCRYPT_COST from the environment (range 4–15); falls back to 12.
 */
function getBcryptCost(): number {
  const envCost = parseInt(process.env.BCRYPT_COST || "", 10);
  if (Number.isFinite(envCost) && envCost >= 4 && envCost <= 15) {
    return envCost;
  }
  return DEFAULT_BCRYPT_COST;
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/** Convert a database row to a UserPublic object. */
function rowToPublic(row: Record<string, unknown>): UserPublic {
  return {
    id: row.id as string,
    username: row.username as string,
    role: row.role as UserRole,
    createdAt: Number(row.created_at),
  };
}

/** Convert a database row to a full User object. */
function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    username: row.username as string,
    hashedPassword: row.hashed_password as string,
    role: row.role as UserRole,
    createdAt: Number(row.created_at),
  };
}

/**
 * Read admin credentials from disk (M15 fix).
 * Returns null if the file doesn't exist or is invalid.
 */
function readAdminCredentials(): AdminCredentialsFile | null {
  const credPath = join(process.cwd(), DEFAULT_CREDENTIALS_FILE);
  if (!existsSync(credPath)) {
    return null;
  }
  try {
    const raw = readFileSync(credPath, "utf-8");
    const creds: AdminCredentialsFile = JSON.parse(raw);
    if (
      creds.version !== 1 ||
      typeof creds.username !== "string" ||
      typeof creds.password !== "string" ||
      typeof creds.createdAt !== "number"
    ) {
      return null;
    }
    return creds;
  } catch {
    return null;
  }
}

/**
 * Write auto-generated admin credentials to disk so they aren't lost (M15 fix).
 * Writes to a file in the working directory with restrictive permissions.
 */
function writeAdminCredentials(creds: AdminCredentialsFile): void {
  const credPath = join(process.cwd(), DEFAULT_CREDENTIALS_FILE);
  try {
    writeFileSync(credPath, JSON.stringify(creds, null, 2), { mode: 0o600 });
    console.log(
      `[userStore] Auto-generated admin credentials saved to ${credPath}. ` +
        `Delete this file after changing the password.`
    );
  } catch (err) {
    console.error(
      `[userStore] Failed to write admin credentials file: ${(err as Error).message}`
    );
  }
}

// ─── UserStore ──────────────────────────────────────────────────────────────

export class UserStore {
  /** Load users from the database. (No-op for DB-backed store — data is always in DB.) */
  load(): void {
    // No-op: data is in the database
  }

  /** Persist users to JSON file. (No-op for DB-backed store.) */
  async save(): Promise<void> {
    // No-op: data is in the database
  }

  /** Create a new user with hashed password. */
  async createUser(
    username: string,
    password: string,
    role: UserRole
  ): Promise<Omit<User, "hashedPassword">> {
    // --- Input validation ---
    if (!username || !password) {
      throw new Error("Username and password are required.");
    }
    if (typeof username !== "string" || typeof password !== "string") {
      throw new Error("Username and password must be strings.");
    }
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 64) {
      throw new Error("Username must be between 3 and 64 characters.");
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      throw new Error("Username may only contain letters, digits, underscores, and hyphens.");
    }
    if (trimmedPassword.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }

    // --- Duplicate username check ---
    if (this.findUser(trimmedUsername)) {
      throw new Error(`Username "${trimmedUsername}" is already taken.`);
    }

    // --- Create user ---
    const hashedPassword = await bcrypt.hash(trimmedPassword, getBcryptCost());
    const id = randomUUID();
    const createdAt = Date.now();

    await execute(
      "INSERT INTO users (id, username, hashed_password, role, created_at) VALUES (?, ?, ?, ?, ?)",
      [id, trimmedUsername, hashedPassword, role, createdAt]
    );

    return { id, username: trimmedUsername, role, createdAt };
  }

  /** Find user by username. */
  findUser(username: string): User | undefined {
    const rows = execute<Record<string, unknown>[]>(
      "SELECT * FROM users WHERE username = ?",
      [username]
    ) as unknown as Record<string, unknown>[];
    return rows.length > 0 ? rowToUser(rows[0]) : undefined;
  }

  /** Find user by ID. */
  findUserById(id: string): User | undefined {
    const rows = execute<Record<string, unknown>[]>(
      "SELECT * FROM users WHERE id = ?",
      [id]
    ) as unknown as Record<string, unknown>[];
    return rows.length > 0 ? rowToUser(rows[0]) : undefined;
  }

  /** Authenticate user by username and password. */
  async authenticate(
    username: string,
    password: string
  ): Promise<Omit<User, "hashedPassword"> | null> {
    const user = this.findUser(username);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.hashedPassword);
    if (!valid) return null;
    return this.stripPassword(user);
  }

  /** Get all users without hashed passwords. */
  getAllUsers(): UserPublic[] {
    const rows = execute<Record<string, unknown>[]>(
      "SELECT id, username, role, created_at FROM users ORDER BY created_at"
    ) as unknown as Record<string, unknown>[];
    return rows.map(rowToPublic);
  }

  /** Update a user (password and/or role). */
  async updateUser(
    id: string,
    updates: { password?: string; role?: UserRole }
  ): Promise<Omit<User, "hashedPassword"> | null> {
    const user = this.findUserById(id);
    if (!user) return null;

    const fields: string[] = [];
    const params: unknown[] = [];

    if (updates.password !== undefined) {
      const trimmed = updates.password.trim();
      if (trimmed.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }
      fields.push("hashed_password = ?");
      params.push(await bcrypt.hash(trimmed, getBcryptCost()));
    }
    if (updates.role) {
      fields.push("role = ?");
      params.push(updates.role);
    }

    if (fields.length > 0) {
      params.push(id);
      await execute(
        `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
        params
      );
    }

    // Refresh user data from DB
    const refreshed = this.findUserById(id);
    return refreshed ? this.stripPassword(refreshed) : null;
  }

  /** Delete a user. */
  async deleteUser(id: string): Promise<boolean> {
    const result = (await execute(
      "DELETE FROM users WHERE id = ?",
      [id]
    )) as { affectedRows: number };
    return result.affectedRows > 0;
  }

  /** Check if any users exist. */
  hasUsers(): boolean {
    const rows = execute<{ count: number }[]>(
      "SELECT COUNT(*) as count FROM users"
    ) as unknown as { count: number }[];
    return rows.length > 0 && rows[0].count > 0;
  }

  /**
   * Seed a default admin user if no users exist.
   *
   * M15 fix: Auto-generated credentials are now persisted to disk
   * (.admin-credentials.json) so they aren't lost if the server runs
   * in a container or daemonized process where console output is not visible.
   */
  async seedDefaultAdmin(): Promise<void> {
    if (this.hasUsers()) return;

    const username = process.env.DEFAULT_ADMIN_USERNAME;
    const password = process.env.DEFAULT_ADMIN_PASSWORD;

    if (!username || !password) {
      // Generate cryptographically random credentials when env vars are not set.
      const generatedUsername = `admin-${randomUUID()}`;
      const generatedPassword = randomUUID() + randomUUID();

      await this.createUser(generatedUsername, generatedPassword, "admin");

      // M15 fix: persist credentials to disk
      writeAdminCredentials({
        version: 1,
        username: generatedUsername,
        password: generatedPassword,
        createdAt: Date.now(),
      });

      console.error(
        `[userStore] Default admin user created with auto-generated credentials: ` +
          `username="${generatedUsername}" — set DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD env vars to customize.`
      );
    } else {
      // Validate env var lengths to prevent injection / DoS via excessively long values
      if (username.length > 64) {
        throw new Error("DEFAULT_ADMIN_USERNAME must be at most 64 characters.");
      }
      if (password.length > 256) {
        throw new Error("DEFAULT_ADMIN_PASSWORD must be at most 256 characters.");
      }
      await this.createUser(username, password, "admin");
      console.warn(
        `[userStore] Default admin user created: "${username}" — ` +
          `change password via API immediately.`
      );
    }
  }

  /** Strip hashed password from user object. */
  private stripPassword(user: User): Omit<User, "hashedPassword"> {
    const { hashedPassword, ...rest } = user;
    return rest;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const userStore = new UserStore();
