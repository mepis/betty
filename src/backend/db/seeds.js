import { getDb } from "./database.js";

/**
 * Built-in roles and their permissions
 */
const BUILTIN_ROLES = [
  {
    name: "super_admin",
    description: "Full access to everything including system roles",
    permissions: "ALL",
  },
  {
    name: "admin",
    description: "Manage users, roles, and chat sessions",
    permissions: [
      { resource: "users", action: "create" },
      { resource: "users", action: "read" },
      { resource: "users", action: "update" },
      { resource: "users", action: "delete" },
      { resource: "roles", action: "create" },
      { resource: "roles", action: "read" },
      { resource: "roles", action: "update" },
      { resource: "roles", action: "delete" },
      { resource: "sessions", action: "create" },
      { resource: "sessions", action: "read" },
      { resource: "sessions", action: "update" },
      { resource: "sessions", action: "delete" },
      { resource: "chat", action: "use" },
    ],
  },
  {
    name: "moderator",
    description: "View and edit users, manage sessions, use chat",
    permissions: [
      { resource: "users", action: "read" },
      { resource: "users", action: "update" },
      { resource: "sessions", action: "read" },
      { resource: "chat", action: "use" },
    ],
  },
  {
    name: "user",
    description: "Default role — manage own sessions and use chat",
    permissions: [
      { resource: "sessions", action: "create" },
      { resource: "sessions", action: "read" },
      { resource: "sessions", action: "update" },
      { resource: "sessions", action: "delete" },
      { resource: "chat", action: "use" },
    ],
  },
];

/**
 * Seed built-in roles and permissions into the database
 */
export function seedBuiltInRoles() {
  const db = getDb();

  const insertRole = db.prepare(
    "INSERT OR IGNORE INTO roles (name, description, is_system) VALUES (?, ?, 1)"
  );
  const getRole = db.prepare("SELECT id FROM roles WHERE name = ?");
  const insertPermission = db.prepare(
    "INSERT OR IGNORE INTO permissions (role_id, resource, action) VALUES (?, ?, ?)"
  );

  const tx = db.transaction(() => {
    for (const role of BUILTIN_ROLES) {
      insertRole.run(role.name, role.description);
      const { id: roleId } = getRole.get(role.name);

      if (role.permissions === "ALL") {
        // Super admin gets all possible permissions
        const allResources = ["users", "roles", "sessions", "chat", "system"];
        const allActions = ["create", "read", "update", "delete", "use", "manage"];
        for (const resource of allResources) {
          for (const action of allActions) {
            insertPermission.run(roleId, resource, action);
          }
        }
      } else {
        for (const perm of role.permissions) {
          insertPermission.run(roleId, perm.resource, perm.action);
        }
      }
    }
  });

  tx();
}

/**
 * Create the default super_admin user if none exists
 * Default: username=admin, email=admin@betty.local, password=admin123
 * In production, this should be handled via env vars or a setup script.
 */
export async function seedDefaultAdmin(bcrypt) {
  const db = getDb();

  const existingUser = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
  if (existingUser) return null;

  const adminRole = db.prepare("SELECT id FROM roles WHERE name = ?").get("super_admin");
  if (!adminRole) {
    throw new Error("super_admin role not found. Run seedBuiltInRoles first.");
  }

  const passwordHash = await bcrypt.hash("admin123", 10);

  db.prepare(
    "INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)"
  ).run("admin", "admin@betty.local", passwordHash, adminRole.id);

  return { username: "admin", email: "admin@betty.local", password: "admin123" };
}
