/**
 * Data layer module for Betty.
 * Provides a unified interface for all data operations, backed by the database
 * (MySQL → SQLite → JSON fallback).
 */
import db from "./db.js";
import * as jsonStore from "./json-store.js";
import fs from "fs";
import { join } from "path";
import os from "os";

const BETTY_DIR = join(os.homedir(), ".betty");

// ============================================
// Configs
// ============================================

/**
 * Get configs from the database (or JSON fallback).
 * @returns {object|null} Configs object or null
 */
export async function getConfigs() {
  try {
    const row = await db.jsonGet("SELECT value FROM configs WHERE id = 1");
    if (row && row.value) {
      return typeof row.value === "string" ? JSON.parse(row.value) : row.value;
    }
  } catch (err) {
    console.error(`[data-layer] Failed to get configs from DB: ${err.message}`);
  }
  // Fallback to JSON file
  return await jsonStore.getConfigs();
}

/**
 * Save configs to the database (or JSON fallback).
 * @param {object} configs - Configs object
 */
export async function saveConfigs(configs) {
  try {
    const now = new Date().toISOString();
    await db.run(
      `REPLACE INTO configs (id, value, updated_at) VALUES (1, ?, ?)`,
      [JSON.stringify(configs), now]
    );
    return;
  } catch (err) {
    console.error(`[data-layer] Failed to save configs to DB: ${err.message}`);
  }
  // Fallback to JSON file
  await jsonStore.saveConfigs(configs);
}

/**
 * Get a single config value.
 * @param {string} key - Config key (supports nested: "gpu_selection.enabled")
 * @returns {*} Config value or undefined
 */
export async function getConfig(key) {
  const configs = await getConfigs();
  if (!configs || !key) return undefined;
  const parts = key.split(".");
  let value = configs;
  for (const part of parts) {
    if (value === undefined || value === null) return undefined;
    value = value[part];
  }
  return value;
}

// ============================================
// Reports
// ============================================

/**
 * List all reports.
 * @returns {Array} Array of report metadata objects
 */
export async function listReports() {
  try {
    const reports = await db.jsonAll(
      "SELECT name, saved_at, created_at, updated_at FROM reports ORDER BY updated_at DESC"
    );
    if (reports && reports.length > 0) {
      return reports.map((r) => ({
        name: r.name,
        filename: `${r.name}.json`,
        created: r.created_at || r.saved_at,
        modified: r.updated_at || r.saved_at,
      }));
    }
  } catch (err) {
    console.error(`[data-layer] Failed to list reports from DB: ${err.message}`);
  }
  // Fallback to JSON files
  return await jsonStore.listReports();
}

/**
 * Get a single report by name.
 * @param {string} name - Report name
 * @returns {object|null} Report object or null
 */
export async function getReport(name) {
  try {
    const report = await db.jsonGet("SELECT * FROM reports WHERE name = ?", [name]);
    if (report) return report;
  } catch (err) {
    console.error(`[data-layer] Failed to get report from DB: ${err.message}`);
  }
  // Fallback to JSON file
  return await jsonStore.getReport(name);
}

/**
 * Save a report.
 * @param {string} name - Report name
 * @param {object} report - Report data
 */
export async function saveReportData(name, report) {
  try {
    const now = new Date().toISOString();
    await db.run(
      `REPLACE INTO reports (name, saved_at, md_content, live_results, configs_per_run, configs, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        report.savedAt || now,
        report.mdContent || "",
        JSON.stringify(report.liveResults || []),
        JSON.stringify(report.configsPerRun || []),
        JSON.stringify(report.configs || {}),
        report.savedAt || now,
        now,
      ]
    );
    return;
  } catch (err) {
    console.error(`[data-layer] Failed to save report to DB: ${err.message}`);
  }
  // Fallback to JSON file
  await jsonStore.saveReport(name, report);
}

/**
 * Delete a report.
 * @param {string} name - Report name
 * @returns {boolean} True if deleted, false if not found
 */
export async function deleteReport(name) {
  try {
    const result = await db.run("DELETE FROM reports WHERE name = ?", [name]);
    return result.affectedRows > 0;
  } catch (err) {
    console.error(`[data-layer] Failed to delete report from DB: ${err.message}`);
  }
  // Fallback to JSON file
  return await jsonStore.deleteReport(name);
}

// ============================================
// Profiles
// ============================================

/**
 * List all profiles.
 * @returns {Array} Array of profile metadata objects
 */
export async function listProfiles() {
  try {
    const profiles = await db.jsonAll(
      "SELECT name, created_at, updated_at FROM profiles ORDER BY updated_at DESC"
    );
    if (profiles && profiles.length > 0) {
      return profiles.map((p) => ({
        name: p.name,
        filename: `${p.name}.json`,
        created: p.created_at,
        modified: p.updated_at,
      }));
    }
  } catch (err) {
    console.error(`[data-layer] Failed to list profiles from DB: ${err.message}`);
  }
  // Fallback to JSON files
  return await jsonStore.listProfiles();
}

/**
 * Get a single profile by name.
 * @param {string} name - Profile name
 * @returns {object|null} Profile data or null
 */
export async function getProfile(name) {
  try {
    const profile = await db.jsonGet("SELECT * FROM profiles WHERE name = ?", [name]);
    if (profile) return profile;
  } catch (err) {
    console.error(`[data-layer] Failed to get profile from DB: ${err.message}`);
  }
  // Fallback to JSON file
  return await jsonStore.getProfile(name);
}

/**
 * Save a profile.
 * @param {string} name - Profile name
 * @param {object} data - Profile data
 */
export async function saveProfile(name, data) {
  try {
    const now = new Date().toISOString();
    await db.run(
      `REPLACE INTO profiles (name, data, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
      [name, JSON.stringify(data), now, now]
    );
    return;
  } catch (err) {
    console.error(`[data-layer] Failed to save profile to DB: ${err.message}`);
  }
  // Fallback to JSON file
  await jsonStore.saveProfile(name, data);
}

/**
 * Delete a profile.
 * @param {string} name - Profile name
 * @returns {boolean} True if deleted, false if not found
 */
export async function deleteProfile(name) {
  try {
    const result = await db.run("DELETE FROM profiles WHERE name = ?", [name]);
    return result.affectedRows > 0;
  } catch (err) {
    console.error(`[data-layer] Failed to delete profile from DB: ${err.message}`);
  }
  // Fallback to JSON file
  return await jsonStore.deleteProfile(name);
}

// ============================================
// Service Profiles
// ============================================

/**
 * List all service profiles.
 * @returns {Array} Array of service profile metadata objects
 */
export async function listServiceProfiles() {
  try {
    const profiles = await db.jsonAll(
      "SELECT name, created_at, updated_at FROM service_profiles ORDER BY updated_at DESC"
    );
    if (profiles && profiles.length > 0) {
      return profiles.map((p) => ({
        name: p.name,
        filename: `${p.name}.json`,
        created: p.created_at,
        modified: p.updated_at,
      }));
    }
  } catch (err) {
    console.error(`[data-layer] Failed to list service profiles from DB: ${err.message}`);
  }
  // Fallback to JSON files
  return await jsonStore.listServiceProfiles();
}

/**
 * Get a single service profile by name.
 * @param {string} name - Service profile name
 * @returns {object|null} Service profile data or null
 */
export async function getServiceProfile(name) {
  try {
    const profile = await db.jsonGet("SELECT * FROM service_profiles WHERE name = ?", [name]);
    if (profile) return profile;
  } catch (err) {
    console.error(`[data-layer] Failed to get service profile from DB: ${err.message}`);
  }
  // Fallback to JSON file
  return await jsonStore.getServiceProfile(name);
}

/**
 * Save a service profile.
 * @param {string} name - Service profile name
 * @param {object} data - Service profile data
 */
export async function saveServiceProfile(name, data) {
  try {
    const now = new Date().toISOString();
    await db.run(
      `REPLACE INTO service_profiles (name, data, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
      [name, JSON.stringify(data), now, now]
    );
    return;
  } catch (err) {
    console.error(`[data-layer] Failed to save service profile to DB: ${err.message}`);
  }
  // Fallback to JSON file
  await jsonStore.saveServiceProfile(name, data);
}

/**
 * Delete a service profile.
 * @param {string} name - Service profile name
 * @returns {boolean} True if deleted, false if not found
 */
export async function deleteServiceProfile(name) {
  try {
    const result = await db.run("DELETE FROM service_profiles WHERE name = ?", [name]);
    return result.affectedRows > 0;
  } catch (err) {
    console.error(`[data-layer] Failed to delete service profile from DB: ${err.message}`);
  }
  // Fallback to JSON file
  return await jsonStore.deleteServiceProfile(name);
}

// ============================================
// Chat Templates
// ============================================

/**
 * List all chat templates.
 * @returns {Array} Array of chat template metadata objects
 */
export async function listChatTemplates() {
  try {
    const templates = await db.jsonAll(
      "SELECT filename, content, size, modified_at FROM chat_templates ORDER BY modified_at DESC"
    );
    if (templates && templates.length > 0) {
      return templates.map((t) => ({
        filename: t.filename,
        size: t.size || (t.content ? t.content.length : 0),
        modified: t.modified_at,
      }));
    }
  } catch (err) {
    console.error(`[data-layer] Failed to list chat templates from DB: ${err.message}`);
  }
  // Fallback to JSON files
  return await jsonStore.listChatTemplates();
}

/**
 * Get a chat template's content.
 * @param {string} filename - Template filename
 * @returns {object|null} Template data or null
 */
export async function getChatTemplate(filename) {
  try {
    const template = await db.jsonGet("SELECT * FROM chat_templates WHERE filename = ?", [filename]);
    if (template) return template;
  } catch (err) {
    console.error(`[data-layer] Failed to get chat template from DB: ${err.message}`);
  }
  // Fallback to file
  return await jsonStore.getChatTemplate(filename);
}

/**
 * Save a chat template.
 * @param {string} filename - Template filename
 * @param {string} content - Template content
 * @param {number} size - Content size in bytes
 */
export async function saveChatTemplate(filename, content, size) {
  try {
    const now = new Date().toISOString();
    await db.run(
      `REPLACE INTO chat_templates (filename, content, size, modified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [filename, content, size || content.length, now, now, now]
    );
  } catch (err) {
    console.error(`[data-layer] Failed to save chat template to DB: ${err.message}`);
  }
  // Also save to file for compatibility
  try {
    await jsonStore.saveChatTemplate(filename, content, size);
  } catch (fileErr) {
    console.error(`[data-layer] Failed to save chat template to file: ${fileErr.message}`);
  }
}

/**
 * Delete a chat template.
 * @param {string} filename - Template filename
 * @returns {boolean} True if deleted, false if not found
 */
export async function deleteChatTemplate(filename) {
  let deleted = false;
  try {
    const result = await db.run("DELETE FROM chat_templates WHERE filename = ?", [filename]);
    deleted = result.affectedRows > 0;
  } catch (err) {
    console.error(`[data-layer] Failed to delete chat template from DB: ${err.message}`);
  }
  // Also delete from file
  const fileDeleted = await jsonStore.deleteChatTemplate(filename);
  return deleted || fileDeleted;
}

// ============================================
// Settings (key-value pairs like JWT secret)
// ============================================

/**
 * Get a setting value.
 * @param {string} key - Setting key
 * @returns {string|null} Setting value or null
 */
export async function getSetting(key) {
  try {
    const row = await db.get("SELECT value FROM settings WHERE key = ?", [key]);
    if (row) return row.value;
  } catch (err) {
    console.error(`[data-layer] Failed to get setting from DB: ${err.message}`);
  }
  // Fallback to JSON file
  return await jsonStore.getSetting(key);
}

/**
 * Save a setting value.
 * @param {string} key - Setting key
 * @param {string} value - Setting value
 */
export async function saveSetting(key, value) {
  try {
    const now = new Date().toISOString();
    await db.run(
      `REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
      [key, String(value), now]
    );
    return;
  } catch (err) {
    console.error(`[data-layer] Failed to save setting to DB: ${err.message}`);
  }
  // Fallback to JSON file
  await jsonStore.saveSetting(key, value);
}
