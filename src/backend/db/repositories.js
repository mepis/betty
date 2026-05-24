import { getDb } from "./database.js";

// ============================================================
// Role Repository
// ============================================================

export const RoleRepo = {
  findAll() {
    const db = getDb();
    return db.prepare("SELECT * FROM roles ORDER BY is_system DESC, name").all();
  },

  findById(id) {
    const db = getDb();
    return db.prepare("SELECT * FROM roles WHERE id = ?").get(id);
  },

  findByName(name) {
    const db = getDb();
    return db.prepare("SELECT * FROM roles WHERE name = ?").get(name);
  },

  findCustom() {
    const db = getDb();
    return db.prepare("SELECT * FROM roles WHERE is_system = 0 ORDER BY name").all();
  },

  create(name, description = "") {
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO roles (name, description) VALUES (?, ?)"
    );
    const result = stmt.run(name, description);
    return this.findById(result.lastInsertRowid);
  },

  update(id, { name, description } = {}) {
    const db = getDb();
    const role = this.findById(id);
    if (!role) return null;
    if (role.is_system) throw new Error("Cannot modify system roles");

    const fields = [];
    const params = [];
    if (name !== undefined) { fields.push("name = ?"); params.push(name); }
    if (description !== undefined) { fields.push("description = ?"); params.push(description); }
    if (fields.length === 0) return role;

    params.push(id);
    db.prepare(`UPDATE roles SET ${fields.join(", ")} WHERE id = ?`).run(...params);
    return this.findById(id);
  },

  async delete(id) {
    const db = getDb();
    const role = this.findById(id);
    if (!role) return false;
    if (role.is_system) throw new Error("Cannot delete system roles");

    // Check if any users have this role
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role_id = ?").get(id);
    if (userCount.count > 0) throw new Error("Cannot delete role assigned to users");

    db.prepare("DELETE FROM roles WHERE id = ?").run(id);
    return true;
  },
};

// ============================================================
// Permission Repository
// ============================================================

const ALL_RESOURCES = ["users", "roles", "sessions", "chat", "system"];
const ALL_ACTIONS = ["create", "read", "update", "delete", "use", "manage"];

export const PermissionRepo = {
  findByRole(roleId) {
    const db = getDb();
    return db.prepare(
      "SELECT * FROM permissions WHERE role_id = ? ORDER BY resource, action"
    ).all(roleId);
  },

  hasPermission(roleId, resource, action) {
    const db = getDb();
    const perm = db.prepare(
      "SELECT id FROM permissions WHERE role_id = ? AND resource = ? AND action = ?"
    ).get(roleId, resource, action);
    return !!perm;
  },

  hasAnyPermission(roleId, resource) {
    const db = getDb();
    const perm = db.prepare(
      "SELECT id FROM permissions WHERE role_id = ? AND resource = ?"
    ).get(roleId, resource);
    return !!perm;
  },

  async addPermission(roleId, resource, action) {
    const db = getDb();
    try {
      db.prepare(
        "INSERT INTO permissions (role_id, resource, action) VALUES (?, ?, ?)"
      ).run(roleId, resource, action);
      return true;
    } catch (err) {
      if (err.message.includes("UNIQUE")) return false; // Already exists
      throw err;
    }
  },

  removePermission(roleId, resource, action) {
    const db = getDb();
    db.prepare(
      "DELETE FROM permissions WHERE role_id = ? AND resource = ? AND action = ?"
    ).run(roleId, resource, action);
  },

  setPermissions(roleId, permissions) {
    const db = getDb();
    const tx = db.transaction(() => {
      // Clear existing
      db.prepare("DELETE FROM permissions WHERE role_id = ?").run(roleId);
      // Insert new
      const insert = db.prepare(
        "INSERT INTO permissions (role_id, resource, action) VALUES (?, ?, ?)"
      );
      for (const perm of permissions) {
        insert.run(roleId, perm.resource, perm.action);
      }
    });
    tx();
  },

  getAllPossible() {
    return ALL_RESOURCES.flatMap((resource) =>
      ALL_ACTIONS.map((action) => ({ resource, action }))
    );
  },
};

// ============================================================
// User Repository
// ============================================================

export const UserRepo = {
  findAll() {
    const db = getDb();
    return db.prepare(`
      SELECT u.id, u.username, u.email, u.role_id, u.created_at,
             r.name as role_name, r.description as role_description
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `).all();
  },

  findById(id) {
    const db = getDb();
    return db.prepare(`
      SELECT u.id, u.username, u.email, u.password_hash, u.role_id, u.created_at,
             r.name as role_name, r.description as role_description
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `).get(id);
  },

  findByUsername(username) {
    const db = getDb();
    return db.prepare(`
      SELECT u.id, u.username, u.email, u.password_hash, u.role_id, u.created_at,
             r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.username = ?
    `).get(username);
  },

  findByEmail(email) {
    const db = getDb();
    return db.prepare(`
      SELECT u.id, u.username, u.email, u.password_hash, u.role_id, u.created_at,
             r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ?
    `).get(email);
  },

  create(username, email, passwordHash, roleId = null) {
    const db = getDb();
    // Default to "user" role if not specified
    if (!roleId) {
      const defaultRole = RoleRepo.findByName("user");
      roleId = defaultRole?.id || 4;
    }

    const stmt = db.prepare(
      "INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(username, email, passwordHash, roleId);
    return this.findById(result.lastInsertRowid);
  },

  update(id, updates = {}) {
    const db = getDb();
    const user = this.findById(id);
    if (!user) return null;

    const fields = [];
    const params = [];

    if (updates.username !== undefined) {
      fields.push("username = ?");
      params.push(updates.username);
    }
    if (updates.email !== undefined) {
      fields.push("email = ?");
      params.push(updates.email);
    }
    if (updates.password_hash !== undefined) {
      fields.push("password_hash = ?");
      params.push(updates.password_hash);
    }
    if (updates.role_id !== undefined) {
      fields.push("role_id = ?");
      params.push(updates.role_id);
    }

    if (fields.length === 0) return user;

    params.push(id);
    db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...params);
    return this.findById(id);
  },

  delete(id) {
    const db = getDb();
    const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
    return result.changes > 0;
  },
};

// ============================================================
// Session Repository
// ============================================================

export const SessionRepo = {
  create(userId, tokenHash, expiresAt) {
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)"
    );
    const result = stmt.run(userId, tokenHash, expiresAt);
    return { id: result.lastInsertRowid, user_id: userId };
  },

  findByTokenHash(tokenHash) {
    const db = getDb();
    return db.prepare(`
      SELECT s.*, u.id as user_id, u.username, u.email, u.role_id
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ? AND s.expires_at > datetime('now')
    `).get(tokenHash);
  },

  deleteById(id) {
    const db = getDb();
    db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
  },

  deleteByUserId(userId) {
    const db = getDb();
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  },
};
