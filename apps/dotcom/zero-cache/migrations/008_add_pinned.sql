-- Purpose: Add an isPinned column to the file_state table that indicates whether the user has pinned the file.

ALTER TABLE file_state
ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT FALSE;