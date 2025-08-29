-- Add index column to group_user table for drag-to-reorder functionality
-- This allows each user to have their own custom ordering of groups using string-based fractional indexing

ALTER TABLE "group_user" ADD COLUMN "index" TEXT;

-- Create index for efficient ordering queries  
CREATE INDEX "group_user_index_idx" ON "group_user" ("userId", "index");

-- Set initial index values for existing group_user records
-- Use tldraw's fractional indexing with 'a1', 'a2', etc. to ensure proper ordering
-- This generates indices like 'a1', 'a2', 'a3' for existing records in creation order
WITH numbered_groups AS (
  SELECT 
    "groupId",
    "userId",
    ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt") as rn
  FROM "group_user"
)
UPDATE "group_user" 
SET "index" = 'a' || numbered_groups.rn::text
FROM numbered_groups
WHERE "group_user"."groupId" = numbered_groups."groupId";

-- Add constraint to ensure index is not null for new records
ALTER TABLE "group_user" ALTER COLUMN "index" SET NOT NULL;