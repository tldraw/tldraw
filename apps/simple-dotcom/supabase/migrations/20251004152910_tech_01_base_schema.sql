-- Simple tldraw MVP - Base Schema Migration
-- TECH-01: Supabase Schema Foundation
-- Created: 2025-10-04
--
-- This migration establishes the core data model for workspaces, documents,
-- folders, members, invitations, presence, and access tracking.
--
-- Search path safeguard
SET search_path TO public;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For search optimization

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Workspace member roles
CREATE TYPE workspace_role AS ENUM ('owner', 'member');

-- Document sharing modes
CREATE TYPE sharing_mode AS ENUM ('private', 'public_read_only', 'public_editable');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table (mirrors Better Auth identity with profile fields)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);

-- Workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Soft delete guard: deleted_at must be set when is_deleted is true
  CONSTRAINT check_deleted_at CHECK (
    (is_deleted = false AND deleted_at IS NULL) OR
    (is_deleted = true AND deleted_at IS NOT NULL)
  )
);

CREATE INDEX idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX idx_workspaces_is_deleted ON workspaces(is_deleted) WHERE is_deleted = false;

-- Workspace members junction table
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_role workspace_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one membership record per user per workspace
  CONSTRAINT unique_workspace_member UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);

-- Invitation links table (one active invite per workspace)
CREATE TABLE invitation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  regenerated_at TIMESTAMPTZ
);

CREATE INDEX idx_invitation_links_token ON invitation_links(token);
CREATE INDEX idx_invitation_links_workspace_id ON invitation_links(workspace_id);

-- Folders table (adjacency list hierarchy)
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_folders_workspace_id ON folders(workspace_id);
CREATE INDEX idx_folders_parent_folder_id ON folders(parent_folder_id);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  sharing_mode sharing_mode NOT NULL DEFAULT 'private',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  r2_key TEXT, -- Reference to R2 snapshot storage
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Archive guard: archived_at must be set when is_archived is true
  CONSTRAINT check_archived_at CHECK (
    (is_archived = false AND archived_at IS NULL) OR
    (is_archived = true AND archived_at IS NOT NULL)
  )
);

CREATE INDEX idx_documents_workspace_id ON documents(workspace_id);
CREATE INDEX idx_documents_folder_id ON documents(folder_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_is_archived ON documents(is_archived) WHERE is_archived = false;
CREATE INDEX idx_documents_sharing_mode ON documents(sharing_mode);
-- Search optimization using pg_trgm
CREATE INDEX idx_documents_name_trgm ON documents USING gin (name gin_trgm_ops);

-- Document access log (for recent documents tracking)
CREATE TABLE document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_access_log_user_id ON document_access_log(user_id, accessed_at DESC);
CREATE INDEX idx_document_access_log_document_id ON document_access_log(document_id);

-- Presence table (real-time sessions)
CREATE TABLE presence (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for guests
  cursor_data JSONB,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_presence_document_id ON presence(document_id);
CREATE INDEX idx_presence_user_id ON presence(user_id);
CREATE INDEX idx_presence_last_seen_at ON presence(last_seen_at);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to validate folder depth (max 10 levels)
CREATE OR REPLACE FUNCTION check_folder_depth()
RETURNS TRIGGER AS $$
DECLARE
  depth INTEGER := 0;
  current_parent UUID;
BEGIN
  current_parent := NEW.parent_folder_id;

  WHILE current_parent IS NOT NULL AND depth < 11 LOOP
    depth := depth + 1;
    SELECT parent_folder_id INTO current_parent
    FROM folders
    WHERE id = current_parent;
  END LOOP;

  IF depth >= 10 THEN
    RAISE EXCEPTION 'Folder depth exceeds maximum of 10 levels';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_folder_depth
  BEFORE INSERT OR UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION check_folder_depth();

-- Function to prevent folder cycles
CREATE OR REPLACE FUNCTION prevent_folder_cycles()
RETURNS TRIGGER AS $$
DECLARE
  current_parent UUID;
BEGIN
  IF NEW.parent_folder_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_folder_id = NEW.id THEN
    RAISE EXCEPTION 'A folder cannot be its own parent';
  END IF;

  current_parent := NEW.parent_folder_id;

  WHILE current_parent IS NOT NULL LOOP
    IF current_parent = NEW.id THEN
      RAISE EXCEPTION 'Folder cycle detected';
    END IF;

    SELECT parent_folder_id INTO current_parent
    FROM folders
    WHERE id = current_parent;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_folder_cycles
  BEFORE INSERT OR UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_folder_cycles();

-- Function to clean up stale presence records (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM presence
  WHERE last_seen_at < now() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PLACEHOLDER RLS HELPER FUNCTIONS
-- ============================================================================
-- These functions will be used by RLS policies implemented in PERM-01
-- They are defined here to avoid schema changes later

-- Check if user is a workspace owner
CREATE OR REPLACE FUNCTION is_workspace_owner(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = workspace_uuid AND owner_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a workspace member (including owner)
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid AND user_id = user_uuid
  ) OR is_workspace_owner(workspace_uuid, user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access a document (member or public sharing mode)
CREATE OR REPLACE FUNCTION can_access_document(document_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  doc_workspace_id UUID;
  doc_sharing_mode sharing_mode;
BEGIN
  SELECT workspace_id, sharing_mode INTO doc_workspace_id, doc_sharing_mode
  FROM documents
  WHERE id = document_uuid;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Public documents are accessible to anyone
  IF doc_sharing_mode IN ('public_read_only', 'public_editable') THEN
    RETURN true;
  END IF;

  -- Private documents require workspace membership
  RETURN is_workspace_member(doc_workspace_id, user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can edit a document
CREATE OR REPLACE FUNCTION can_edit_document(document_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  doc_workspace_id UUID;
  doc_sharing_mode sharing_mode;
BEGIN
  SELECT workspace_id, sharing_mode INTO doc_workspace_id, doc_sharing_mode
  FROM documents
  WHERE id = document_uuid;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Public editable documents are editable by anyone
  IF doc_sharing_mode = 'public_editable' THEN
    RETURN true;
  END IF;

  -- Private and public_read_only require workspace membership to edit
  RETURN is_workspace_member(doc_workspace_id, user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'User profiles mirroring Better Auth identity';
COMMENT ON TABLE workspaces IS 'Workspaces (private or shared) owned by users';
COMMENT ON TABLE workspace_members IS 'Junction table for workspace membership with roles';
COMMENT ON TABLE invitation_links IS 'Workspace invitation links (one active per workspace)';
COMMENT ON TABLE folders IS 'Folder hierarchy using adjacency list pattern (max depth 10)';
COMMENT ON TABLE documents IS 'Documents with workspace/folder organization and sharing modes';
COMMENT ON TABLE document_access_log IS 'Tracks recent document access for dashboard recents';
COMMENT ON TABLE presence IS 'Real-time presence sessions with cursor data';

COMMENT ON FUNCTION is_workspace_owner IS 'Helper for RLS: checks if user owns workspace';
COMMENT ON FUNCTION is_workspace_member IS 'Helper for RLS: checks if user is member or owner';
COMMENT ON FUNCTION can_access_document IS 'Helper for RLS: checks document access permissions';
COMMENT ON FUNCTION can_edit_document IS 'Helper for RLS: checks document edit permissions';
COMMENT ON FUNCTION cleanup_stale_presence IS 'Removes presence records older than 5 minutes';
