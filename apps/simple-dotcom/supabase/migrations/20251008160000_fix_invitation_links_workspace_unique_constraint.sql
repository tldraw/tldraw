-- Migration: Fix invitation links workspace unique constraint for regeneration support
-- Description: Remove the unique constraint on workspace_id that prevents multiple invitation links
-- This allows us to keep superseded invitation links while only one is active

-- First, drop any existing unique constraint on workspace_id
-- This might be a constraint or an index depending on how it was created
DO $$
BEGIN
    -- Try to drop as a constraint
    ALTER TABLE invitation_links DROP CONSTRAINT IF EXISTS invitation_links_workspace_id_key CASCADE;
EXCEPTION
    WHEN undefined_object THEN
        NULL; -- Constraint doesn't exist, that's fine
END $$;

-- Also drop as an index if it exists
DROP INDEX IF EXISTS invitation_links_workspace_id_key CASCADE;

-- Now ensure we have the proper partial unique index
-- This ensures only one active (non-superseded) invitation link per workspace
DROP INDEX IF EXISTS idx_invitation_links_workspace_active;
CREATE UNIQUE INDEX idx_invitation_links_workspace_active
ON invitation_links(workspace_id)
WHERE superseded_by_token_id IS NULL;

COMMENT ON INDEX idx_invitation_links_workspace_active IS
'Ensures only one active (non-superseded) invitation link exists per workspace';