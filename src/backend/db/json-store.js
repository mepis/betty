/**
 * JSON file fallback store.
 * Implements the same interface as db.js for when both MySQL and SQLite are unavailable.
 * Reads/writes JSON files directly, mimicking the db.* interface.
 */
import fs from "fs";
import { join } from "path";
import os from "os";
import crypto from "crypto";

const BETTY_DIR = join(os.homedir(), ".betty");

// File paths
const USERS_FILE = join(BETTY_DIR, "users.json");
const CONFIGS_FILE = join(BETTY_DIR, "configs.json");
const REPORTS_DIR = join(BETTY_DIR, "reports");
const PROFILES_DIR = join(BETTY_DIR, "profiles");
const SERVICE_PROFILES_DIR = join(BETTY_DIR, "service-profiles");
const CHAT_TEMPLATES_DIR = join(BETTY_DIR, "chat_templates");
const SETTINGS_FILE = join(BETTY_DIR, "settings.json");

let initialized = false;

/**
 * Ensure the .betty directory and all required subdirectories exist.
 */
function ensureBettyDir() {
  if (!fs.existsSync(BETTY_DIR)) {
    fs.mkdirSync(BETTY_DIR, { recursive: true });
  }
  ensureDirectory(REPORTS_DIR);
  ensureDirectory(PROFILES_DIR);
  ensureDirectory(SERVICE_PROFILES_DIR);
  ensureDirectory(CHAT_TEMPLATES_DIR);
}

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Initialize: ensure all directories exist.
 */
async function init() {
  ensureBettyDir();
  // Initialize settings file if it doesn't exist
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({}), "utf-8");
  }
  initialized = true;
}

/**
 * Execute a query (generic). Returns affected rows count.
 * Note: This is a simplified implementation for the fallback.
 */
async function query(sql, params = []) {
  if (!initialized) await init();
  // For the JSON fallback, we delegate to the specific entity methods
  // This is a no-op for generic queries
  return { affectedRows: 0 };
}

/**
 * Get a single row.
 * @param {string} sql - SQL query (entity:table where=field value format)
 * @param {Array} params - Parameters
 * @returns {object|null} Single row or null
 */
async function get(sql, params = []) {
  if (!initialized) await init();
  return null;
}

/**
 * Get all rows.
 * @param {string} sql - SQL query
 * @param {Array} params - Parameters
 * @returns {Array} Array of rows
 */
async function all(sql, params = []) {
  if (!initialized) await init();
  return [];
}

/**
 * Run an insert/update/delete.
 * @param {string} sql - SQL query
 * @param {Array} params - Parameters
 * @returns {object} { affectedRows, lastId }
 */
async function run(sql, params = []) {
  if (!initialized) await init();
  return { affectedRows: 0, lastId: null };
}

/**
 * Get a single row with JSON parsing.
 * @param {string} sql - SQL query
 * @param {Array} params - Parameters
 * @returns {object|null} Single row or null
 */
async function jsonGet(sql, params = []) {
  if (!initialized) await init();
  return null;
}

/**
 * Get all rows with JSON parsing.
 * @param {string} sql - SQL query
 * @param {Array} params - Parameters
 * @returns {Array} Array of rows with JSON parsed
 */
async function jsonAll(sql, params = []) {
  if (!initialized) await init();
  return [];
}

/**
 * Run with JSON serialization.
 * @param {string} sql - SQL query
 * @param {Array} params - Parameters
 * @param {object} value - JSON value to serialize
 * @returns {object} { affectedRows, lastId }
 */
async function jsonRun(sql, params = [], value) {
  if (!initialized) await init();
  return { affectedRows: 0, lastId: null };
}

/**
 * Close the connection (no-op for JSON store).
 */
async function close() {
  initialized = false;
}

// ============================================
// Entity-specific methods for JSON file fallback
// ============================================

/**
 * Load all users from JSON file.
 */
async function getUsers() {
  ensureBettyDir();
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`[json-store] Failed to load users: ${err.message}`);
    return [];
  }
}

/**
 * Save all users to JSON file.
 */
async function saveUsers(users) {
  ensureBettyDir();
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error(`[json-store] Failed to save users: ${err.message}`);
    throw err;
  }
}

/**
 * Find a user by username.
 */
async function findUser(username) {
  const users = await getUsers();
  return users.find((u) => u.username === username) || null;
}

/**
 * Find a user by id.
 */
async function findUserById(id) {
  const users = await getUsers();
  return users.find((u) => u.id === id) || null;
}

/**
 * Add a new user.
 */
async function addUser(user) {
  const users = await getUsers();
  const now = new Date().toISOString();
  const newUser = {
    id: crypto.randomUUID(),
    username: user.username,
    passwordHash: user.passwordHash,
    role: user.role || "viewer",
    createdAt: now,
    updatedAt: now,
  };
  users.push(newUser);
  await saveUsers(users);
  return newUser;
}

/**
 * Update a user by username.
 */
async function updateUser(username, updates) {
  const users = await getUsers();
  const index = users.findIndex((u) => u.username === username);
  if (index === -1) return null;
  users[index] = {
    ...users[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await saveUsers(users);
  return users[index];
}

/**
 * Delete a user by username.
 */
async function deleteUser(username) {
  const users = await getUsers();
  const filtered = users.filter((u) => u.username !== username);
  if (filtered.length === users.length) return false;
  await saveUsers(filtered);
  return true;
}

/**
 * List all users (without password hashes).
 */
async function listUsers() {
  const users = await getUsers();
  return users.map(({ id, username, role, createdAt, updatedAt }) => ({
    id,
    username,
    role,
    createdAt,
    updatedAt,
  }));
}

/**
 * Check if any users exist.
 */
async function hasUsers() {
  const users = await getUsers();
  return users.length > 0;
}

/**
 * Get the number of users.
 */
async function getUserCount() {
  const users = await getUsers();
  return users.length;
}

/**
 * Get configs from JSON file.
 */
async function getConfigs() {
  ensureBettyDir();
  if (!fs.existsSync(CONFIGS_FILE)) return null;
  try {
    const data = fs.readFileSync(CONFIGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`[json-store] Failed to load configs: ${err.message}`);
    return null;
  }
}

/**
 * Save configs to JSON file.
 */
async function saveConfigs(configs) {
  ensureBettyDir();
  try {
    fs.writeFileSync(CONFIGS_FILE, JSON.stringify(configs, null, 2), "utf-8");
  } catch (err) {
    console.error(`[json-store] Failed to save configs: ${err.message}`);
    throw err;
  }
}

/**
 * List reports from reports directory.
 */
async function listReports() {
  ensureBettyDir();
  if (!fs.existsSync(REPORTS_DIR)) return [];
  try {
    const files = fs.readdirSync(REPORTS_DIR).filter((f) => f.endsWith(".json"));
    return files.map((file) => {
      const stats = fs.statSync(join(REPORTS_DIR, file));
      const name = file.replace(/\.json$/, "");
      return {
        name,
        filename: file,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    }).sort((a, b) => b.modified - a.modified);
  } catch (err) {
    console.error(`[json-store] Failed to list reports: ${err.message}`);
    return [];
  }
}

/**
 * Get a single report.
 */
async function getReport(name) {
  ensureBettyDir();
  const filePath = join(REPORTS_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`[json-store] Failed to load report "${name}": ${err.message}`);
    return null;
  }
}

/**
 * Save a report.
 */
async function saveReport(name, report) {
  ensureBettyDir();
  const filePath = join(REPORTS_DIR, `${name}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf-8");
  } catch (err) {
    console.error(`[json-store] Failed to save report "${name}": ${err.message}`);
    throw err;
  }
}

/**
 * Delete a report.
 */
async function deleteReport(name) {
  ensureBettyDir();
  const filePath = join(REPORTS_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) return false;
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    console.error(`[json-store] Failed to delete report "${name}": ${err.message}`);
    return false;
  }
}

/**
 * List profiles from profiles directory.
 */
async function listProfiles() {
  ensureBettyDir();
  if (!fs.existsSync(PROFILES_DIR)) return [];
  try {
    const files = fs.readdirSync(PROFILES_DIR).filter((f) => f.endsWith(".json"));
    return files.map((file) => {
      const stats = fs.statSync(join(PROFILES_DIR, file));
      const name = file.replace(/\.json$/, "");
      return {
        name,
        filename: file,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    }).sort((a, b) => b.modified - a.modified);
  } catch (err) {
    console.error(`[json-store] Failed to list profiles: ${err.message}`);
    return [];
  }
}

/**
 * Get a single profile.
 */
async function getProfile(name) {
  ensureBettyDir();
  const filePath = join(PROFILES_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`[json-store] Failed to load profile "${name}": ${err.message}`);
    return null;
  }
}

/**
 * Save a profile.
 */
async function saveProfile(name, data) {
  ensureBettyDir();
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = join(PROFILES_DIR, `${safeName}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`[json-store] Failed to save profile "${name}": ${err.message}`);
    throw err;
  }
}

/**
 * Delete a profile.
 */
async function deleteProfile(name) {
  ensureBettyDir();
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = join(PROFILES_DIR, `${safeName}.json`);
  if (!fs.existsSync(filePath)) return false;
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    console.error(`[json-store] Failed to delete profile "${name}": ${err.message}`);
    return false;
  }
}

/**
 * List service profiles from service-profiles directory.
 */
async function listServiceProfiles() {
  ensureBettyDir();
  if (!fs.existsSync(SERVICE_PROFILES_DIR)) return [];
  try {
    const files = fs.readdirSync(SERVICE_PROFILES_DIR).filter((f) => f.endsWith(".json"));
    return files.map((file) => {
      const stats = fs.statSync(join(SERVICE_PROFILES_DIR, file));
      const name = file.replace(/\.json$/, "");
      return {
        name,
        filename: file,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    }).sort((a, b) => b.modified - a.modified);
  } catch (err) {
    console.error(`[json-store] Failed to list service profiles: ${err.message}`);
    return [];
  }
}

/**
 * Get a single service profile.
 */
async function getServiceProfile(name) {
  ensureBettyDir();
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = join(SERVICE_PROFILES_DIR, `${safeName}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`[json-store] Failed to load service profile "${name}": ${err.message}`);
    return null;
  }
}

/**
 * Save a service profile.
 */
async function saveServiceProfile(name, data) {
  ensureBettyDir();
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = join(SERVICE_PROFILES_DIR, `${safeName}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`[json-store] Failed to save service profile "${name}": ${err.message}`);
    throw err;
  }
}

/**
 * Delete a service profile.
 */
async function deleteServiceProfile(name) {
  ensureBettyDir();
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = join(SERVICE_PROFILES_DIR, `${safeName}.json`);
  if (!fs.existsSync(filePath)) return false;
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    console.error(`[json-store] Failed to delete service profile "${name}": ${err.message}`);
    return false;
  }
}

/**
 * List chat templates from chat_templates directory.
 */
async function listChatTemplates() {
  ensureBettyDir();
  if (!fs.existsSync(CHAT_TEMPLATES_DIR)) return [];
  try {
    const files = fs.readdirSync(CHAT_TEMPLATES_DIR).filter((f) => f.endsWith(".json"));
    return files.map((file) => {
      const stats = fs.statSync(join(CHAT_TEMPLATES_DIR, file));
      return {
        filename: file,
        size: stats.size,
        modified: stats.mtime,
      };
    }).sort((a, b) => b.modified - a.modified);
  } catch (err) {
    console.error(`[json-store] Failed to list chat templates: ${err.message}`);
    return [];
  }
}

/**
 * Get a chat template's content.
 */
async function getChatTemplate(filename) {
  ensureBettyDir();
  const filePath = join(CHAT_TEMPLATES_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const stats = fs.statSync(filePath);
    return { filename, content, size: stats.size, modified: stats.mtime };
  } catch (err) {
    console.error(`[json-store] Failed to load chat template "${filename}": ${err.message}`);
    return null;
  }
}

/**
 * Save a chat template (both file and DB record).
 */
async function saveChatTemplate(filename, content, size) {
  ensureBettyDir();
  const filePath = join(CHAT_TEMPLATES_DIR, filename);
  try {
    fs.writeFileSync(filePath, content, "utf-8");
  } catch (err) {
    console.error(`[json-store] Failed to save chat template "${filename}": ${err.message}`);
    throw err;
  }
}

/**
 * Delete a chat template (both file and DB record).
 */
async function deleteChatTemplate(filename) {
  ensureBettyDir();
  const filePath = join(CHAT_TEMPLATES_DIR, filename);
  if (!fs.existsSync(filePath)) return false;
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    console.error(`[json-store] Failed to delete chat template "${filename}": ${err.message}`);
    return false;
  }
}

/**
 * Get a setting value by key.
 */
async function getSetting(key) {
  ensureBettyDir();
  if (!fs.existsSync(SETTINGS_FILE)) return null;
  try {
    const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
    const settings = JSON.parse(data);
    return settings[key] || null;
  } catch (err) {
    console.error(`[json-store] Failed to load setting "${key}": ${err.message}`);
    return null;
  }
}

/**
 * Save a setting value.
 */
async function saveSetting(key, value) {
  ensureBettyDir();
  let settings = {};
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    } catch (err) {
      console.error(`[json-store] Failed to load settings: ${err.message}`);
    }
  }
  settings[key] = value;
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error(`[json-store] Failed to save setting "${key}": ${err.message}`);
    throw err;
  }
}

/**
 * List all settings.
 */
async function listSettings() {
  ensureBettyDir();
  if (!fs.existsSync(SETTINGS_FILE)) return {};
  try {
    const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`[json-store] Failed to load settings: ${err.message}`);
    return {};
  }
}

export {
  init,
  query,
  get,
  all,
  run,
  close,
  jsonGet,
  jsonAll,
  jsonRun,
  // Entity-specific methods
  getUsers,
  saveUsers,
  findUser,
  findUserById,
  addUser,
  updateUser,
  deleteUser,
  listUsers,
  hasUsers,
  getUserCount,
  getConfigs,
  saveConfigs,
  listReports,
  getReport,
  saveReport,
  deleteReport,
  listProfiles,
  getProfile,
  saveProfile,
  deleteProfile,
  listServiceProfiles,
  getServiceProfile,
  saveServiceProfile,
  deleteServiceProfile,
  listChatTemplates,
  getChatTemplate,
  saveChatTemplate,
  deleteChatTemplate,
  getSetting,
  saveSetting,
  listSettings,
};
