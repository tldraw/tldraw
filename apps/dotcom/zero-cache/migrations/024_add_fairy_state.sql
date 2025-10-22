-- Purpose: Add a fairyState column to the file_state table that stores per-user, per-file fairy agent state.

ALTER TABLE file_state
ADD COLUMN "fairyState" VARCHAR;

