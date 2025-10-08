-- Migration: Support invitation token regeneration tracking
-- Description: Add superseded_by_token_id to track when tokens are replaced
-- This allows us to show "Link Expired" vs "Invalid Link" messages

-- Add superseded_by_token_id column to track token supersession
ALTER TABLE invitation_links
ADD COLUMN IF NOT EXISTS superseded_by_token_id UUID REFERENCES invitation_links(id) ON DELETE SET NULL;

-- Add index for performance when looking up superseded tokens
CREATE INDEX IF NOT EXISTS idx_invitation_links_superseded_by
ON invitation_links(superseded_by_token_id);

-- Add index on token for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitation_links_token
ON invitation_links(token);

COMMENT ON COLUMN invitation_links.superseded_by_token_id IS
'Points to the new invitation_link that superseded this one when regenerated. NULL means this is the current active token.';
