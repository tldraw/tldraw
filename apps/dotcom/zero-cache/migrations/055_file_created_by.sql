-- Who created the board, for the gallery's "Created by me" tab. Set by the createFile mutator.
-- Nullable with no default so the ALTER does not rewrite "file" (968k rows). Existing boards stay
-- NULL: home workspace boards are attributed by isFileCreatedByUser instead (a home workspace's id
-- is its user's id).
ALTER TABLE public."file" ADD COLUMN "createdBy" VARCHAR;
