-- AUTH-02: Sync Supabase Auth users to public.users
-- Created: 2025-10-05
-- Replaces Better Auth with Supabase Auth sync mechanism
--
-- This migration:
-- 1. Removes obsolete Better Auth tables and columns
-- 2. Creates a trigger to sync auth.users to public.users
-- 3. Provisions private workspace on user signup

SET search_path TO public;

-- ============================================================================
-- CLEANUP: Remove Better Auth artifacts
-- ============================================================================

-- Drop Better Auth tables (no longer needed)
DROP TABLE IF EXISTS account CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS verification CASCADE;

-- Remove Better Auth columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;

-- ============================================================================
-- SYNC: Sync auth.users to public.users
-- ============================================================================

-- Function to handle new user creation from auth.users
-- This runs on INSERT or UPDATE to auth.users and ensures the user exists in public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
    name = COALESCE(EXCLUDED.name, users.name),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on auth.users to sync to public.users
-- This ensures every authenticated user exists in public.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also handle updates (e.g., email changes)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email OR OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PROVISIONING: Create private workspace on signup
-- ============================================================================

-- Function to provision a private workspace for new users
CREATE OR REPLACE FUNCTION public.provision_user_workspace()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  workspace_uuid UUID;
BEGIN
  -- Create a private workspace for the new user
  INSERT INTO public.workspaces (owner_id, name, is_private, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.display_name, split_part(NEW.email, '@', 1)) || '''s Workspace',
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO workspace_uuid;

  -- Add the user as a member with owner role (for consistency with workspace_members queries)
  -- Note: This is redundant with owner_id but needed for membership queries
  INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
  VALUES (workspace_uuid, NEW.id, 'owner', NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to provision workspace after user is created in public.users
DROP TRIGGER IF EXISTS on_user_provision_workspace ON public.users;
CREATE TRIGGER on_user_provision_workspace
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.provision_user_workspace();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.handle_new_user IS 'Syncs auth.users to public.users on signup/update';
COMMENT ON FUNCTION public.provision_user_workspace IS 'Creates private workspace for new users';
COMMENT ON TABLE users IS 'User profiles synced from Supabase Auth (auth.users)';
