-- Add pinnedIndex column to file_state table for drag-to-reorder functionality of favorites
-- This allows users to have custom ordering of their pinned/favorite files using string-based fractional indexing

ALTER TABLE "file_state" ADD COLUMN "pinnedIndex" TEXT;

-- Create index for efficient ordering queries of pinned files
CREATE INDEX "file_state_pinned_index_idx" ON "file_state" ("userId", "pinnedIndex") WHERE "isPinned" = true;

-- Set initial index values for existing pinned files
-- Use tldraw's fractional indexing with 'a1', 'a2', etc. to ensure proper ordering
-- This generates indices like 'a1', 'a2', 'a3' for existing pinned files ordered by lastEditAt
WITH numbered_pinned AS (
  SELECT 
    "userId",
    "fileId",
    ROW_NUMBER() OVER (
      PARTITION BY "userId" 
      ORDER BY COALESCE("lastEditAt", "firstVisitAt", 0) DESC
    ) as rn
  FROM "file_state"
  WHERE "isPinned" = true
)
UPDATE "file_state" 
SET "pinnedIndex" = 'a' || numbered_pinned.rn::text
FROM numbered_pinned
WHERE "file_state"."userId" = numbered_pinned."userId" 
  AND "file_state"."fileId" = numbered_pinned."fileId"
  AND "file_state"."isPinned" = true;