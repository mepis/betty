-- ============================================
-- Betty Database Schema
-- Supports MySQL (MariaDB) and SQLite
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Configs table (single row, id=1)
CREATE TABLE IF NOT EXISTS configs (
  id INT PRIMARY KEY DEFAULT 1,
  value TEXT NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  name VARCHAR(255) PRIMARY KEY,
  saved_at DATETIME NOT NULL,
  md_content TEXT,
  live_results TEXT,
  configs_per_run TEXT,
  configs TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  name VARCHAR(255) PRIMARY KEY,
  data TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Service profiles table
CREATE TABLE IF NOT EXISTS service_profiles (
  name VARCHAR(255) PRIMARY KEY,
  data TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Chat templates table
CREATE TABLE IF NOT EXISTS chat_templates (
  filename VARCHAR(255) PRIMARY KEY,
  content TEXT NOT NULL,
  size INT NOT NULL DEFAULT 0,
  modified_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Settings table (simple key-value pairs like JWT secret)
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Migration tracking
CREATE TABLE IF NOT EXISTS migrations (
  version INT PRIMARY KEY,
  applied_at DATETIME NOT NULL
);
