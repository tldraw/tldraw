-- Denormalize the viewer's display name and color onto file_state, so the comment composer's
-- @-mention roster can offer everyone who has opened a board — not just its workspace members —
-- without joining (and thereby syncing) the private "user" row to every reader. Same pattern as
-- comment."authorName"/"authorColor" (migration 040) and group_user."userName"/"userColor".

ALTER TABLE file_state
  ADD COLUMN "userName" VARCHAR DEFAULT '' NOT NULL,
  ADD COLUMN "userColor" VARCHAR DEFAULT '' NOT NULL;

-- Backfill existing rows from the user table so viewers who opened a board before this migration
-- are still resolvable in the roster.
UPDATE file_state fs
SET "userName" = u."name",
    "userColor" = u."color"
FROM public."user" u
WHERE u."id" = fs."userId";

-- Stamp viewer details on insert — onEnterFile upserts a file_state row keyed by (userId, fileId)
-- and only knows userId. BEFORE INSERT keeps it a single write with no extra WAL entry for Zero.
-- (userId is part of the primary key and never changes, so as with the comment author trigger the
-- UPDATE branch effectively never fires; renames are handled by the trigger below.)
CREATE OR REPLACE FUNCTION set_file_state_user_details() RETURNS TRIGGER AS $$
DECLARE
  visitor_name VARCHAR;
  visitor_color VARCHAR;
BEGIN
  SELECT u."name", u."color" INTO visitor_name, visitor_color
  FROM public."user" u
  WHERE u."id" = NEW."userId";
  -- a missing user row keeps the '' defaults; the client filters nameless rows out of the roster
  IF FOUND THEN
    NEW."userName" := visitor_name;
    NEW."userColor" := visitor_color;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "set_file_state_user_details_trigger"
BEFORE INSERT OR UPDATE OF "userId" ON file_state
FOR EACH ROW
EXECUTE FUNCTION set_file_state_user_details();

-- Propagate user renames and recolors to their existing file_state rows, so the roster stays fresh
-- even for a viewer who never re-opens the board.
CREATE OR REPLACE FUNCTION update_file_state_user_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE file_state
  SET "userName" = NEW."name",
      "userColor" = NEW."color"
  WHERE "userId" = NEW."id";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "update_file_state_user_details_trigger"
AFTER UPDATE OF "name", "color" ON public."user"
FOR EACH ROW
WHEN (OLD."name" IS DISTINCT FROM NEW."name" OR OLD."color" IS DISTINCT FROM NEW."color")
EXECUTE FUNCTION update_file_state_user_details();

-- No ALTER PUBLICATION: file_state is already replicated to Zero (the fileStates query), so it is
-- already a member of the zero_data publication.
