-- Force removal of the workspace unique constraint that's being cached
-- This migration ensures the constraint is removed even if connection pooling is caching the old schema

-- First, drop the constraint if it exists (it shouldn't but pooling might cache it)
ALTER TABLE invitation_links DROP CONSTRAINT IF EXISTS invitation_links_workspace_id_key;

-- Drop any indexes that might enforce uniqueness on workspace_id alone
DROP INDEX IF EXISTS invitation_links_workspace_id_key;

-- Verify the unique constraint on workspace_id where superseded_by_token_id IS NULL still exists
-- This is the correct constraint we want to keep
-- It's created as: CREATE UNIQUE INDEX idx_invitation_links_workspace_active
-- ON invitation_links(workspace_id) WHERE superseded_by_token_id IS NULL;

-- Force a schema cache refresh by altering the table in a harmless way
ALTER TABLE invitation_links ALTER COLUMN created_at SET DEFAULT NOW();