-- Per workspace, like the pin index, so every member of the workspace sees a board as archived.
-- Nullable with no default so the ALTER does not rewrite group_file.
ALTER TABLE public."group_file" ADD COLUMN "archivedAt" BIGINT;
