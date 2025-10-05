-- BUG-24: Fix Invitation Link Provisioning
-- Created: 2025-10-08
--
-- This migration fixes the bug where workspaces don't have invitation links
-- after creation. It:
-- 1. Creates a helper function to generate URL-safe random tokens
-- 2. Updates provision_user_workspace() to create invitation links
-- 3. Backfills invitation links for existing non-private workspaces

SET search_path TO public;

-- ============================================================================
-- SCHEMA FIX: Update invitation_links default to disabled
-- ============================================================================

-- Change default from true to false - invitation links should be disabled by default for security
ALTER TABLE invitation_links ALTER COLUMN enabled SET DEFAULT false;

-- ============================================================================
-- HELPER FUNCTION: Generate URL-safe random token
-- ============================================================================

-- Generate a secure random token compatible with base64url encoding
-- This matches the format used in the API: randomBytes(32).toString('base64url')
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate 32 random bytes, encode as base64, then make URL-safe
  -- Replace + with -, / with _, and remove = padding
  token := encode(gen_random_bytes(32), 'base64');
  token := replace(token, '+', '-');
  token := replace(token, '/', '_');
  token := rtrim(token, '=');
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATE: provision_user_workspace to create invitation links
-- ============================================================================

-- Updated function to provision a private workspace for new users
-- Now also creates an invitation link for non-private workspaces
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
  -- Links are disabled by default for security - owner must explicitly enable
  IF NOT is_private_workspace THEN
    INSERT INTO public.invitation_links (workspace_id, token, enabled, created_by, created_at)
    VALUES (
      workspace_uuid,
      generate_invite_token(),
      false,
      NEW.id,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-create invitation links for new non-private workspaces
-- ============================================================================

-- Function to auto-create invitation link when a workspace is created
CREATE OR REPLACE FUNCTION auto_create_invitation_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create invitation link for non-private workspaces
  -- Links are disabled by default for security - owner must explicitly enable
  IF NEW.is_private = false THEN
    INSERT INTO public.invitation_links (workspace_id, token, enabled, created_by, created_at)
    VALUES (
      NEW.id,
      generate_invite_token(),
      false,
      NEW.owner_id,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create invitation links for new non-private workspaces
DROP TRIGGER IF EXISTS trigger_auto_create_invitation_link ON public.workspaces;
CREATE TRIGGER trigger_auto_create_invitation_link
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  WHEN (NEW.is_private = false)
  EXECUTE FUNCTION auto_create_invitation_link();

-- ============================================================================
-- BACKFILL: Create invitation links for existing non-private workspaces
-- ============================================================================

-- Create invitation links for all existing non-private workspaces that don't have one
-- Links are disabled by default for security - owner must explicitly enable
INSERT INTO public.invitation_links (workspace_id, token, enabled, created_by, created_at)
SELECT
  w.id,
  generate_invite_token(),
  false,
  w.owner_id,
  NOW()
FROM public.workspaces w
WHERE w.is_private = false
  AND w.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM public.invitation_links il
    WHERE il.workspace_id = w.id
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION generate_invite_token IS 'Generates a URL-safe random token for invitation links (matches base64url format)';
COMMENT ON FUNCTION auto_create_invitation_link IS 'Automatically creates invitation link for new non-private workspaces';
