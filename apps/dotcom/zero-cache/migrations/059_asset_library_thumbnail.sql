-- Whether an upload is the thumbnail of an item in a board's library, rather than an image the user
-- uploaded. The upload's client says so when it uploads it; uploads from before this column can't be
-- told apart and stay false.
--
-- A constant default, so adding the column only changes the catalog: no table rewrite. It still takes
-- ACCESS EXCLUSIVE on "asset" for that moment.
ALTER TABLE "asset" ADD COLUMN "isLibraryThumbnail" BOOLEAN NOT NULL DEFAULT false;

-- The libraries panel's Uploads tab lists a user's uploads, newest first. Without this the planner
-- walks every asset row.
--
-- A plain build, not CONCURRENTLY: the runner applies migrations inside its own transaction, where
-- CONCURRENTLY isn't allowed. It takes SHARE on "asset" for the build, so the queue's inserts of new
-- uploads wait for it.
CREATE INDEX IF NOT EXISTS asset_user_uploaded_at_idx ON "asset" ("userId", "uploadedAt" DESC);
