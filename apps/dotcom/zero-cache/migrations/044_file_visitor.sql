-- A shareable, per-file record of who has opened a board, so the comment composer can offer past
-- viewers (not just workspace members) as @-mention targets. This is its OWN table rather than
-- columns on file_state: file_state also carries private per-user data — lastSessionState (a user's
-- camera position, current page, and selected shapes) and visit/edit timestamps — that must never
-- sync to other users. Zero synced queries replicate whole rows, so exposing the viewer list from
-- file_state would leak all of that. Every column here is safe to show to any file collaborator.
-- Identity is denormalized (same reasoning as comment.authorName, migration 040): joining the user
-- row would sync private user fields to every reader.

CREATE TABLE file_visitor (
  "userId" VARCHAR NOT NULL,
  "fileId" VARCHAR NOT NULL,
  "userName" VARCHAR DEFAULT '' NOT NULL,
  "userColor" VARCHAR DEFAULT '' NOT NULL,
  -- mirrored from file_state for most-recent-first ordering of the roster. NOT NULL (falling back
  -- to lastEditAt/firstVisitAt/now at write time) so the fileVisitors query's ORDER BY ... DESC is
  -- deterministic — ZQL has no NULLS LAST, and Postgres DESC would sort nulls first.
  "lastVisitAt" BIGINT NOT NULL,
  PRIMARY KEY ("userId", "fileId")
);

CREATE INDEX file_visitor_file_id_idx ON file_visitor("fileId");

-- Backfill from existing visits. user.name/user.color are NOT NULL (000_seed.sql), so COALESCE only
-- guards the (impossible here) missing-join case and keeps the NOT NULL columns satisfied.
INSERT INTO file_visitor ("userId", "fileId", "userName", "userColor", "lastVisitAt")
SELECT fs."userId", fs."fileId", COALESCE(u."name", ''), COALESCE(u."color", ''),
  -- same fallback chain as the client's getFileVisitDate, then "now" for rows with no visit data
  COALESCE(fs."lastVisitAt", fs."lastEditAt", fs."firstVisitAt", (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT)
FROM file_state fs
JOIN public."user" u ON u."id" = fs."userId"
ON CONFLICT ("userId", "fileId") DO NOTHING;

-- Mirror a visit (file_state insert, or a lastVisitAt refresh on exit) into file_visitor, stamping
-- the visitor's current name/color. Keyed the same as file_state, so it's a natural upsert.
CREATE OR REPLACE FUNCTION sync_file_visitor_on_file_state() RETURNS TRIGGER AS $$
DECLARE
  visitor_name VARCHAR;
  visitor_color VARCHAR;
BEGIN
  SELECT u."name", u."color" INTO visitor_name, visitor_color
  FROM public."user" u
  WHERE u."id" = NEW."userId";
  INSERT INTO file_visitor ("userId", "fileId", "userName", "userColor", "lastVisitAt")
  VALUES (NEW."userId", NEW."fileId", COALESCE(visitor_name, ''), COALESCE(visitor_color, ''),
    -- a fresh file_state row (createFile / first onEnterFile) has no lastVisitAt yet; the visit is
    -- happening right now, so stamp "now" rather than leave the roster entry unsortable
    COALESCE(NEW."lastVisitAt", NEW."lastEditAt", NEW."firstVisitAt", (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT))
  ON CONFLICT ("userId", "fileId") DO UPDATE SET
    "userName" = COALESCE(visitor_name, file_visitor."userName"),
    "userColor" = COALESCE(visitor_color, file_visitor."userColor"),
    "lastVisitAt" = COALESCE(NEW."lastVisitAt", file_visitor."lastVisitAt");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "sync_file_visitor_on_file_state_trigger"
AFTER INSERT OR UPDATE OF "lastVisitAt" ON file_state
FOR EACH ROW
EXECUTE FUNCTION sync_file_visitor_on_file_state();

-- Drop the roster entry when the visit is removed (e.g. un-sharing a file deletes non-owner
-- file_state rows — see 034_fix_unshare_group_file_cleanup.sql), so a viewer who loses access also
-- drops out of the mention roster.
CREATE OR REPLACE FUNCTION delete_file_visitor_on_file_state() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM file_visitor WHERE "userId" = OLD."userId" AND "fileId" = OLD."fileId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "delete_file_visitor_on_file_state_trigger"
AFTER DELETE ON file_state
FOR EACH ROW
EXECUTE FUNCTION delete_file_visitor_on_file_state();

-- Propagate user renames and recolors to their existing roster entries, so the roster stays fresh
-- even for a viewer who never re-opens the board (same pattern as update_comment_author_details).
CREATE OR REPLACE FUNCTION update_file_visitor_user_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE file_visitor
  SET "userName" = NEW."name",
      "userColor" = NEW."color"
  WHERE "userId" = NEW."id";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "update_file_visitor_user_details_trigger"
AFTER UPDATE OF "name", "color" ON public."user"
FOR EACH ROW
WHEN (OLD."name" IS DISTINCT FROM NEW."name" OR OLD."color" IS DISTINCT FROM NEW."color")
EXECUTE FUNCTION update_file_visitor_user_details();

-- New table, so it must be added to the Zero replication publication (unlike file_state, which was
-- already a member).
ALTER PUBLICATION zero_data ADD TABLE file_visitor;
