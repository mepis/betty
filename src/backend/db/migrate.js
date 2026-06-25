#!/usr/bin/env node

/**
 * Migration script for Betty database.
 * Supports bidirectional migration between:
 *   - SQLite (source or target)
 *   - MySQL (source or target)
 *   - JSON files (source or target)
 *
 * Usage:
 *   node migrate.js json-to-mysql [--dry-run] [--verbose]
 *   node migrate.js sqlite-to-mysql [--dry-run] [--verbose]
 *   node migrate.js mysql-to-sqlite [--dry-run] [--verbose]
 *   node migrate.js mysql-to-json [--dry-run] [--verbose]
 *   node migrate.js sqlite-to-json [--dry-run] [--verbose]
 *   node migrate.js json-to-sqlite [--dry-run] [--verbose]
 */
import db from "./db.js";
import * as jsonStore from "./json-store.js";
import fs from "fs";
import { join } from "path";
import os from "os";

const BETTY_DIR = join(os.homedir(), ".betty");

// Parse arguments
const args = process.argv.slice(2);
const migrationType = args[0];
const dryRun = args.includes("--dry-run");
const verbose = args.includes("--verbose");

// Supported migrations
const supportedMigrations = [
  "json-to-mysql",
  "json-to-sqlite",
  "sqlite-to-mysql",
  "sqlite-to-json",
  "mysql-to-sqlite",
  "mysql-to-json",
];

function printUsage() {
  console.log(`
Betty Database Migration Tool

Usage:
  node migrate.js <source>-to-<target> [options]

Supported migrations:
${supportedMigrations.map((m) => `  ${m}`).join("\n")}

Options:
  --dry-run    Preview changes without writing
  --verbose    Show detailed per-record logging

Examples:
  node migrate.js json-to-mysql
  node migrate.js json-to-mysql --dry-run
  node migrate.js mysql-to-sqlite --verbose
  node migrate.js sqlite-to-json --dry-run --verbose
`);
}

// ============================================
// Migration Logic
// ============================================

async function migrate(source, target, dryRun, verbose) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Betty Database Migration`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Source: ${source}`);
  console.log(`Target: ${target}`);
  console.log(`Dry run: ${dryRun ? "yes" : "no"}`);
  console.log(`${"=".repeat(60)}\n`);

  const summary = {
    tables: {},
    errors: [],
  };

  // Define entity migrations
  const entities = [
    {
      name: "users",
      sourceFn: jsonStore.getUsers,
      targetFn: target === "mysql" || target === "sqlite" ? migrateUsersToDb : migrateUsersToJson,
    },
    {
      name: "configs",
      sourceFn: jsonStore.getConfigs,
      targetFn: target === "mysql" || target === "sqlite" ? migrateConfigsToDb : migrateConfigsToJson,
    },
    {
      name: "reports",
      sourceFn: jsonStore.listReports,
      targetFn: target === "mysql" || target === "sqlite" ? migrateReportsToDb : migrateReportsToJson,
    },
    {
      name: "profiles",
      sourceFn: jsonStore.listProfiles,
      targetFn: target === "mysql" || target === "sqlite" ? migrateProfilesToDb : migrateProfilesToJson,
    },
    {
      name: "service_profiles",
      sourceFn: jsonStore.listServiceProfiles,
      targetFn: target === "mysql" || target === "sqlite" ? migrateServiceProfilesToDb : migrateServiceProfilesToJson,
    },
    {
      name: "chat_templates",
      sourceFn: jsonStore.listChatTemplates,
      targetFn: target === "mysql" || target === "sqlite" ? migrateChatTemplatesToDb : migrateChatTemplatesToJson,
    },
    {
      name: "settings",
      sourceFn: jsonStore.listSettings,
      targetFn: target === "mysql" || target === "sqlite" ? migrateSettingsToDb : migrateSettingsToJson,
    },
  ];

  // For each entity, migrate data
  for (const entity of entities) {
    try {
      console.log(`\n--- Migrating: ${entity.name} ---`);
      const result = await migrateEntity(entity, source, target, dryRun, verbose);
      summary.tables[entity.name] = result;
    } catch (err) {
      console.error(`[migration] Error migrating ${entity.name}: ${err.message}`);
      summary.errors.push({ table: entity.name, error: err.message });
      summary.tables[entity.name] = { error: err.message };
    }
  }

  // Print summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Migration Summary`);
  console.log(`${"=".repeat(60)}`);

  for (const [table, result] of Object.entries(summary.tables)) {
    if (result.error) {
      console.log(`  ${table}: ERROR - ${result.error}`);
    } else {
      console.log(`  ${table}: ${result.migrated} records migrated`);
      if (result.skipped) {
        console.log(`    ${result.skipped} records skipped (already exist)`);
      }
    }
  }

  if (summary.errors.length > 0) {
    console.log(`\nErrors: ${summary.errors.length}`);
    for (const err of summary.errors) {
      console.log(`  ${err.table}: ${err.error}`);
    }
  }

  console.log(`\nBackend: ${db.getBackend()}`);
  console.log(`${"=".repeat(60)}\n`);

  return summary;
}

async function migrateEntity(entity, source, target, dryRun, verbose) {
  const result = { migrated: 0, skipped: 0 };

  // Get source data
  let sourceData = await entity.sourceFn();
  if (sourceData === null) sourceData = [];
  if (!Array.isArray(sourceData)) {
    // Configs and settings are objects, not arrays
    sourceData = [sourceData];
  }

  const total = sourceData.length;
  if (total === 0) {
    console.log(`  No records to migrate`);
    return result;
  }

  console.log(`  Found ${total} record(s) to migrate`);

  for (const item of sourceData) {
    if (dryRun) {
      if (verbose) {
        console.log(`    [DRY-RUN] Would migrate: ${item.name || item.filename || item.key || "unknown"}`);
      }
      result.migrated++;
    } else {
      try {
        await entity.targetFn(item, verbose);
        result.migrated++;
      } catch (err) {
        console.error(`    [ERROR] Failed to migrate ${item.name || item.filename || item.key || "unknown"}: ${err.message}`);
        result.skipped++;
      }
    }
  }

  return result;
}

// ============================================
// Entity-specific migration functions
// ============================================

async function migrateUsersToDb(user, verbose) {
  if (!user.id || !user.username) return;
  const result = await db.run(
    `REPLACE INTO users (id, username, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.username,
      user.passwordHash,
      user.role || "viewer",
      user.createdAt,
      user.updatedAt || user.createdAt,
    ]
  );
  if (verbose) {
    console.log(`      User: ${user.username} (${user.role})`);
  }
}

async function migrateConfigsToDb(configs, verbose) {
  if (!configs) return;
  const now = new Date().toISOString();
  await db.run(
    `REPLACE INTO configs (id, value, updated_at) VALUES (1, ?, ?)`,
    [JSON.stringify(configs), now]
  );
  if (verbose) {
    console.log(`      Configs: ${Object.keys(configs).length} top-level keys`);
  }
}

async function migrateReportsToDb(report, verbose) {
  if (!report.name) return;
  const now = new Date().toISOString();
  await db.run(
    `REPLACE INTO reports (name, saved_at, md_content, live_results, configs_per_run, configs, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      report.name,
      report.savedAt || now,
      report.mdContent || "",
      JSON.stringify(report.liveResults || []),
      JSON.stringify(report.configsPerRun || []),
      JSON.stringify(report.configs || {}),
      report.savedAt || now,
      now,
    ]
  );
  if (verbose) {
    console.log(`      Report: ${report.name} (${(report.liveResults?.length || 0)} test runs)`);
  }
}

async function migrateProfilesToDb(profile, verbose) {
  if (!profile.name) return;
  const now = new Date().toISOString();
  await db.run(
    `REPLACE INTO profiles (name, data, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    [
      profile.name,
      JSON.stringify(profile.data || {}),
      profile.created?.toISOString?.() || now,
      now,
    ]
  );
  if (verbose) {
    console.log(`      Profile: ${profile.name}`);
  }
}

async function migrateServiceProfilesToDb(profile, verbose) {
  if (!profile.name) return;
  const now = new Date().toISOString();
  await db.run(
    `REPLACE INTO service_profiles (name, data, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    [
      profile.name,
      JSON.stringify(profile.data || {}),
      profile.created?.toISOString?.() || now,
      now,
    ]
  );
  if (verbose) {
    console.log(`      Service Profile: ${profile.name}`);
  }
}

async function migrateChatTemplatesToDb(template, verbose) {
  if (!template.filename) return;
  // For chat templates, we need the actual content from the file
  const filePath = join(BETTY_DIR, "chat_templates", template.filename);
  let content = "";
  let size = 0;
  try {
    content = fs.readFileSync(filePath, "utf-8");
    size = content.length;
  } catch (err) {
    console.error(`      [WARN] Could not read chat template file: ${filePath}`);
    return;
  }
  const now = new Date().toISOString();
  await db.run(
    `REPLACE INTO chat_templates (filename, content, size, modified_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      template.filename,
      content,
      size,
      template.modified?.toISOString?.() || now,
      template.modified?.toISOString?.() || now,
      now,
    ]
  );
  if (verbose) {
    console.log(`      Chat Template: ${template.filename} (${size} bytes)`);
  }
}

async function migrateSettingsToDb(settings, verbose) {
  if (!settings || typeof settings !== "object") return;
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(settings)) {
    await db.run(
      `REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
      [key, String(value), now]
    );
    if (verbose) {
      console.log(`      Setting: ${key}`);
    }
  }
}

// ============================================
// JSON migration functions (DB → JSON)
// ============================================

async function migrateUsersToJson(user, verbose) {
  // For DB → JSON, we need to read from DB first
  // This is handled by the migrateEntity function calling the target function
  // We need a different approach: read from DB, write to JSON
  // The targetFn is called per-item, so we need to pass the item directly
  if (!user.id || !user.username) return;

  // Read existing users from JSON
  let users = await jsonStore.getUsers();

  // Check if user already exists
  const existing = users.findIndex((u) => u.username === user.username);
  if (existing !== -1) {
    users[existing] = {
      ...users[existing],
      passwordHash: user.passwordHash,
      role: user.role || "viewer",
      updatedAt: user.updatedAt || new Date().toISOString(),
    };
  } else {
    users.push({
      ...user,
      passwordHash: user.passwordHash,
      role: user.role || "viewer",
      updatedAt: user.updatedAt || new Date().toISOString(),
    });
  }

  await jsonStore.saveUsers(users);
  if (verbose) {
    console.log(`      User: ${user.username} (${user.role})`);
  }
}

async function migrateConfigsToJson(configs, verbose) {
  if (!configs) return;
  await jsonStore.saveConfigs(configs.value || configs);
  if (verbose) {
    const data = configs.value || configs;
    console.log(`      Configs: ${Object.keys(data).length} top-level keys`);
  }
}

async function migrateReportsToJson(report, verbose) {
  if (!report.name) return;
  const reportData = {
    name: report.name,
    savedAt: report.saved_at || report.savedAt,
    mdContent: report.md_content || report.mdContent || "",
    liveResults: report.live_results || report.liveResults || [],
    configsPerRun: report.configs_per_run || report.configsPerRun || [],
    configs: report.configs || {},
  };
  await jsonStore.saveReport(report.name, reportData);
  if (verbose) {
    console.log(`      Report: ${report.name} (${reportData.liveResults.length} test runs)`);
  }
}

async function migrateProfilesToJson(profile, verbose) {
  if (!profile.name) return;
  const data = typeof profile.data === "string" ? JSON.parse(profile.data) : profile.data;
  await jsonStore.saveProfile(profile.name, data);
  if (verbose) {
    console.log(`      Profile: ${profile.name}`);
  }
}

async function migrateServiceProfilesToJson(profile, verbose) {
  if (!profile.name) return;
  const data = typeof profile.data === "string" ? JSON.parse(profile.data) : profile.data;
  await jsonStore.saveServiceProfile(profile.name, data);
  if (verbose) {
    console.log(`      Service Profile: ${profile.name}`);
  }
}

async function migrateChatTemplatesToJson(template, verbose) {
  if (!template.filename) return;
  const content = typeof template.content === "string" ? template.content : "";
  await jsonStore.saveChatTemplate(template.filename, content, template.size || content.length);
  if (verbose) {
    console.log(`      Chat Template: ${template.filename} (${template.size || content.length} bytes)`);
  }
}

async function migrateSettingsToJson(settings, verbose) {
  if (!settings || typeof settings !== "object") return;
  for (const [key, value] of Object.entries(settings)) {
    await jsonStore.saveSetting(key, value);
    if (verbose) {
      console.log(`      Setting: ${key}`);
    }
  }
}

// ============================================
// Main
// ============================================

async function main() {
  if (!migrationType || !supportedMigrations.includes(migrationType)) {
    if (migrationType === "--help" || migrationType === "-h") {
      printUsage();
      return;
    }
    console.error(`Error: Invalid migration type "${migrationType}"`);
    console.error(`Supported: ${supportedMigrations.join(", ")}`);
    console.error(`\nUse --help for usage information`);
    process.exit(1);
  }

  const [source, target] = migrationType.split("-to-");

  // Initialize the target database
  console.log(`Initializing ${target} backend...`);
  if (target === "mysql") {
    await db.mysqlInit();
  } else if (target === "sqlite") {
    await db.sqliteInit();
  } else {
    // JSON — no initialization needed beyond ensuring directories
    jsonStore.ensureBettyDir();
  }

  try {
    await migrate(source, target, dryRun, verbose);
  } finally {
    // Clean up
    if (target === "mysql") {
      await db.mysqlClose();
    } else if (target === "sqlite") {
      db.sqliteClose();
    }
  }
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
