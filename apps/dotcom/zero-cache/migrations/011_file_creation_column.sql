-- Used for tracking the creation source of a file. Can be a duplication of an existing file, 
-- or slurping of a legacy file (multiplayer, readonly, snapshot).
-- This is only used immediately after creation and should then be set to null.
ALTER TABLE "file"
ADD COLUMN "createSource" VARCHAR;
