-- BUG-26: Enable Invitation Links by Default
-- Created: 2025-10-08
--
-- This migration fixes the bug where invitation links are created as disabled by default,
-- which breaks the expected user experience and test expectations.
--
-- The original schema (20251004152910_tech_01_base_schema.sql) had enabled=true by default.
-- Migration 20251008120000 changed this to false for "security reasons", but this breaks
-- the user experience where workspaces should have working invitation links immediately.
--
-- This migration:
-- 1. Reverts the default value to true (enabled by default)
-- 2. Updates existing disabled invitation links to enabled
-- 3. Updates trigger functions to create enabled links

SET search_path TO public;

-- ============================================================================
-- SCHEMA FIX: Revert invitation_links default to enabled
-- ============================================================================

-- Change default from false back to true - invitation links should work immediately
-- Users can disable them manually if they want
ALTER TABLE invitation_links ALTER COLUMN enabled SET DEFAULT true;

-- ============================================================================
-- DATA FIX: Enable existing disabled invitation links
-- ============================================================================

-- Enable all currently disabled invitation links
-- This ensures existing workspaces work as expected
UPDATE invitation_links
SET enabled = true
WHERE enabled = false;

-- ============================================================================
-- UPDATE: provision_user_workspace to create enabled invitation links
-- ============================================================================

CREATE OR REPLACE FUNCTION public.provision_user_workspace()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  workspace_uuid UUID;
  is_private_workspace BOOLEAN;
BEGIN
  -- Determine if this should be a private workspace (default: true for provisioned workspaces)
  is_private_workspace := true;

  -- Create a workspace for the new user
  INSERT INTO public.workspaces (owner_id, name, is_private, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.display_name, split_part(NEW.email, '@', 1)) || '''s Workspace',
    is_private_workspace,
    NOW(),
    NOW()
  )
  RETURNING id INTO workspace_uuid;

  -- Add the user as a member with owner role (for consistency with workspace_members queries)
  INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
  VALUES (workspace_uuid, NEW.id, 'owner', NOW());

  -- Create invitation link for non-private workspaces
  -- Private workspaces don't get invitation links by design
  -- Links are enabled by default for immediate use
  IF NOT is_private_workspace THEN
    INSERT INTO public.invitation_links (workspace_id, token, enabled, created_by, created_at)
    VALUES (
      workspace_uuid,
      generate_invite_token(),
      true,  -- Changed from false to true
      NEW.id,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATE: Auto-create enabled invitation links for new workspaces
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_invitation_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create invitation link for non-private workspaces
  -- Links are enabled by default for immediate use
  IF NEW.is_private = false THEN
    INSERT INTO public.invitation_links (workspace_id, token, enabled, created_by, created_at)
    VALUES (
      NEW.id,
      generate_invite_token(),
      true,  -- Changed from false to true
      NEW.owner_id,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN invitation_links.enabled IS 'Whether invitation link is active. Default: true (enabled by default for immediate use)';
