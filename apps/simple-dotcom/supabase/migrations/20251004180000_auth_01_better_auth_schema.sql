-- Better Auth Schema
-- AUTH-01: Email/Password authentication tables and fields
-- Created: 2025-10-04

SET search_path TO public;

-- Add password and email verification fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Better Auth session table
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_expires_at ON session(expires_at);

-- Better Auth account table (for OAuth, future use)
CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(provider_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_account_user_id ON account(user_id);

-- Better Auth verification table (for email verification, password reset)
CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);
CREATE INDEX IF NOT EXISTS idx_verification_expires_at ON verification(expires_at);

-- Update users table to have better auth defaults
-- These ensure users created via Better Auth work with our existing schema
COMMENT ON TABLE users IS 'User accounts - managed by Better Auth for authentication';
COMMENT ON COLUMN users.email IS 'Primary email address - unique identifier';
COMMENT ON COLUMN users.password_hash IS 'Hashed password for email/password auth';
COMMENT ON COLUMN users.email_verified IS 'Whether email has been verified';
