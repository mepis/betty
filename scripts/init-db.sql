-- Betty Database Schema
-- Migrates from file-based JSON storage to MySQL/MariaDB
-- Migration version: 1

-- Create the database if not exists
CREATE DATABASE IF NOT EXISTS betty
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE betty;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user', 'viewer') NOT NULL DEFAULT 'user',
  created_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Application users with role-based access control';

-- Sessions table (tracks pi agent sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  pi_session_id VARCHAR(255) DEFAULT NULL,
  name VARCHAR(200) DEFAULT 'Untitled',
  model_id VARCHAR(100) DEFAULT NULL,
  model_provider VARCHAR(50) DEFAULT NULL,
  thinking_level VARCHAR(20) DEFAULT 'medium',
  message_count INT DEFAULT 0,
  status ENUM('active', 'compact', 'closed') DEFAULT 'active',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tracks pi agent sessions per user';

-- Session messages table (persisted conversation history)
CREATE TABLE IF NOT EXISTS session_messages (
  id CHAR(36) PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content LONGTEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  is_streaming TINYINT(1) DEFAULT 0,
  created_at BIGINT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Persisted conversation messages per session';

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_session_messages_session_id ON session_messages(session_id);
CREATE INDEX idx_session_messages_timestamp ON session_messages(timestamp);
CREATE INDEX idx_session_messages_created_at ON session_messages(created_at);
