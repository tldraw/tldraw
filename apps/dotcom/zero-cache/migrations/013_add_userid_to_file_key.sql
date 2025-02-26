-- In order to correctly dispatch file delete events, we need to know the owner of the file
-- Prior to this migration we did already store the ownerId on the file table, but it was not part of the primary key
-- so it was not present in the replication events for deletions.
-- This migration adds the ownerId to the primary key of the file table, and recreates the dependent foreign keys
-- which had to be deleted when we dropped the file_pkey constraint. Alas there's no way to alter a primary key constraint in place.
-- To maintain the invariant that the file id is unique, we add a new uniqueness constraint on the id column.

ALTER TABLE "file"
DROP CONSTRAINT "file_pkey" CASCADE,
ADD PRIMARY KEY ("id", "ownerId"),
ADD CONSTRAINT "file_id_unique" UNIQUE ("id");

ALTER TABLE "asset"
ADD CONSTRAINT "asset_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file" ("id") ON DELETE CASCADE;

ALTER TABLE "file_state"
ADD CONSTRAINT "file_state_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file" ("id") ON DELETE CASCADE;