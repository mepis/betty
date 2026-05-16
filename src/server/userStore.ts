import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcrypt";

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

interface UserStoreData {
  users: User[];
}

// ─── UserStore ──────────────────────────────────────────────────────────────

export class UserStore {
  private dataFilePath: string;
  private users: User[] = [];

  constructor(dataFilePath?: string) {
    this.dataFilePath = dataFilePath || path.join(process.cwd(), "data", "users.json");
  }

  /** Load users from JSON file. If file doesn't exist, start fresh. */
  load(): void {
    try {
      if (!fs.existsSync(this.dataFilePath)) {
        this.users = [];
        return;
      }
      const raw = fs.readFileSync(this.dataFilePath, "utf-8");
      const data: UserStoreData = JSON.parse(raw);
      this.users = data.users || [];
    } catch (err) {
      // If file is corrupt, start fresh
      console.warn("[userStore] Failed to load users.json, starting fresh:", (err as Error).message);
      this.users = [];
    }
  }

  /** Persist users to JSON file. */
  save(): void {
    const dir = path.dirname(this.dataFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data: UserStoreData = { users: this.users };
    fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2), "utf-8");
  }

  /** Create a new user with hashed password. */
  async createUser(
    username: string,
    password: string,
    role: UserRole
  ): Promise<Omit<User, "hashedPassword">> {
    const hashedPassword = await bcrypt.hash(password, 12);
    const user: User = {
      id: crypto.randomUUID(),
      username,
      hashedPassword,
      role,
      createdAt: Date.now(),
    };
    this.users.push(user);
    this.save();
    return this.stripPassword(user);
  }

  /** Find user by username. */
  findUser(username: string): User | undefined {
    return this.users.find((u) => u.username === username);
  }

  /** Find user by ID. */
  findUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
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
    return this.users.map((u) => this.stripPassword(u));
  }

  /** Update a user (password and/or role). */
  async updateUser(
    id: string,
    updates: { password?: string; role?: UserRole }
  ): Promise<Omit<User, "hashedPassword"> | null> {
    const user = this.findUserById(id);
    if (!user) return null;

    if (updates.password) {
      user.hashedPassword = await bcrypt.hash(updates.password, 12);
    }
    if (updates.role) {
      user.role = updates.role;
    }
    this.save();
    return this.stripPassword(user);
  }

  /** Delete a user. */
  deleteUser(id: string): boolean {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    this.users.splice(idx, 1);
    this.save();
    return true;
  }

  /** Check if any users exist. */
  hasUsers(): boolean {
    return this.users.length > 0;
  }

  /** Seed a default admin user if no users exist. */
  async seedDefaultAdmin(): Promise<void> {
    if (this.hasUsers()) return;

    const username = process.env.DEFAULT_ADMIN_USERNAME || "admin";
    const password = process.env.DEFAULT_ADMIN_PASSWORD || "admin";

    await this.createUser(username, password, "admin");
    console.warn(
      `[userStore] Default admin user created: "${username}" / "${password}". ` +
        `Change password via API immediately. Set DEFAULT_ADMIN_USERNAME/DEFAULT_ADMIN_PASSWORD env vars to customize.`
    );
  }

  /** Strip hashed password from user object. */
  private stripPassword(user: User): Omit<User, "hashedPassword"> {
    const { hashedPassword, ...rest } = user;
    return rest;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const userStore = new UserStore();
