import { Router } from "express";
import { RoleRepo, PermissionRepo } from "../db/repositories.js";
import { authMiddleware, requirePermission, requireAdmin } from "../auth/middleware.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// List all roles
router.get("/", requirePermission("roles", "read"), (req, res) => {
  const roles = RoleRepo.findAll();

  // Enrich each role with its permissions
  const rolesWithPerms = roles.map((role) => ({
    ...role,
    permissions: PermissionRepo.findByRole(role.id),
  }));

  res.json(rolesWithPerms);
});

// Get a single role
router.get("/:id", requirePermission("roles", "read"), (req, res) => {
  const role = RoleRepo.findById(req.params.id);
  if (!role) {
    return res.status(404).json({ error: "Role not found" });
  }

  res.json({
    ...role,
    permissions: PermissionRepo.findByRole(role.id),
  });
});

// Get all possible permissions
router.get("/permissions/available", requirePermission("roles", "read"), (req, res) => {
  res.json(PermissionRepo.getAllPossible());
});

// Create a custom role
router.post("/", requireAdmin, (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Role name is required" });
    }

    if (name.length < 2 || name.length > 30) {
      return res.status(400).json({ error: "Role name must be 2-30 characters" });
    }

    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      return res.status(400).json({
        error: "Role name must start with a letter and contain only lowercase letters, numbers, and underscores",
      });
    }

    const existing = RoleRepo.findByName(name);
    if (existing) {
      return res.status(409).json({ error: "Role already exists" });
    }

    const role = RoleRepo.create(name, description || "");

    // Set permissions if provided
    if (permissions && Array.isArray(permissions)) {
      PermissionRepo.setPermissions(role.id, permissions);
    }

    res.status(201).json({
      message: "Role created",
      role: {
        ...role,
        permissions: PermissionRepo.findByRole(role.id),
      },
    });
  } catch (err) {
    console.error("[roles] Create error:", err);
    res.status(500).json({ error: "Failed to create role" });
  }
});

// Update a role (custom roles only)
router.put("/:id", requireAdmin, (req, res) => {
  try {
    const { name, description } = req.body;
    const role = RoleRepo.update(req.params.id, { name, description });

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    res.json({
      message: "Role updated",
      role: {
        ...role,
        permissions: PermissionRepo.findByRole(role.id),
      },
    });
  } catch (err) {
    if (err.message.includes("system")) {
      return res.status(403).json({ error: err.message });
    }
    console.error("[roles] Update error:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// Delete a role (custom roles only)
router.delete("/:id", requireAdmin, (req, res) => {
  try {
    const deleted = RoleRepo.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Role not found" });
    }

    res.json({ message: "Role deleted" });
  } catch (err) {
    if (err.message.includes("system") || err.message.includes("assigned")) {
      return res.status(403).json({ error: err.message });
    }
    console.error("[roles] Delete error:", err);
    res.status(500).json({ error: "Failed to delete role" });
  }
});

// Set permissions for a role
router.put("/:id/permissions", requireAdmin, (req, res) => {
  try {
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: "permissions must be an array" });
    }

    const role = RoleRepo.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    if (role.is_system) {
      return res.status(403).json({ error: "Cannot modify system role permissions" });
    }

    PermissionRepo.setPermissions(role.id, permissions);

    res.json({
      message: "Permissions updated",
      role: {
        ...role,
        permissions: PermissionRepo.findByRole(role.id),
      },
    });
  } catch (err) {
    console.error("[roles] Set permissions error:", err);
    res.status(500).json({ error: "Failed to update permissions" });
  }
});

// Add a single permission to a role
router.post("/:id/permissions", requireAdmin, (req, res) => {
  try {
    const { resource, action } = req.body;

    if (!resource || !action) {
      return res.status(400).json({ error: "resource and action are required" });
    }

    const role = RoleRepo.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    if (role.is_system) {
      return res.status(403).json({ error: "Cannot modify system role permissions" });
    }

    PermissionRepo.addPermission(role.id, resource, action);

    res.json({
      message: "Permission added",
      role: {
        ...role,
        permissions: PermissionRepo.findByRole(role.id),
      },
    });
  } catch (err) {
    console.error("[roles] Add permission error:", err);
    res.status(500).json({ error: "Failed to add permission" });
  }
});

// Remove a single permission from a role
router.delete("/:id/permissions", requireAdmin, (req, res) => {
  try {
    const { resource, action } = req.body;

    if (!resource || !action) {
      return res.status(400).json({ error: "resource and action are required" });
    }

    const role = RoleRepo.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    if (role.is_system) {
      return res.status(403).json({ error: "Cannot modify system role permissions" });
    }

    PermissionRepo.removePermission(role.id, resource, action);

    res.json({
      message: "Permission removed",
      role: {
        ...role,
        permissions: PermissionRepo.findByRole(role.id),
      },
    });
  } catch (err) {
    console.error("[roles] Remove permission error:", err);
    res.status(500).json({ error: "Failed to remove permission" });
  }
});

export default router;
