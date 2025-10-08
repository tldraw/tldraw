-- Fix RLS policy on invitation_links to allow non-members to read invitations
-- This is necessary for users to be able to join workspaces via invitation links

-- Drop the restrictive policy that only allowed workspace members to view invitations
DROP POLICY IF EXISTS "Workspace members can view invitation links" ON invitation_links;

-- Create a new policy that allows anyone to read invitation links
-- This is safe because:
-- 1. Invitation tokens are meant to be shared
-- 2. The invite join API still validates the invitation and checks permissions
-- 3. Write operations (UPDATE, DELETE, INSERT) are still restricted to owners
CREATE POLICY "Anyone can view invitation links"
  ON invitation_links
  FOR SELECT
  TO public
  USING (true);
