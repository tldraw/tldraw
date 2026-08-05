-- Denormalize the reacting user's display name onto reaction rows, like comment.authorName:
-- joining "user" from the notifications query would expose private user fields to file readers.

ALTER TABLE comment_reaction ADD COLUMN "userName" VARCHAR DEFAULT '' NOT NULL;

-- Stamp the name on insert — the Durable Object only knows userId.
CREATE OR REPLACE FUNCTION set_comment_reaction_user_name() RETURNS TRIGGER AS $$
DECLARE
  user_name VARCHAR;
BEGIN
  SELECT u."name" INTO user_name
  FROM public."user" u
  WHERE u."id" = NEW."userId";
  -- a missing user row keeps the default, so the insert still fails its user FK check
  IF FOUND THEN
    NEW."userName" := user_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "set_comment_reaction_user_name_trigger"
BEFORE INSERT OR UPDATE OF "userId" ON comment_reaction
FOR EACH ROW
EXECUTE FUNCTION set_comment_reaction_user_name();

-- Propagate user renames to their existing reactions.
CREATE OR REPLACE FUNCTION update_comment_reaction_user_name() RETURNS TRIGGER AS $$
BEGIN
  UPDATE comment_reaction
  SET "userName" = NEW."name"
  WHERE "userId" = NEW."id";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "update_comment_reaction_user_name_trigger"
AFTER UPDATE OF "name" ON public."user"
FOR EACH ROW
WHEN (OLD."name" IS DISTINCT FROM NEW."name")
EXECUTE FUNCTION update_comment_reaction_user_name();

-- Backfill rows that predate the column.
UPDATE comment_reaction cr
SET "userName" = u."name"
FROM public."user" u
WHERE u."id" = cr."userId";

-- Top-N scans for the app-level feeds: the comments and reactions queries order by createdAt
-- desc with a limit; without these, every query hydration scans and sorts the whole table.
CREATE INDEX comment_created_at_idx ON comment("createdAt" DESC);
CREATE INDEX comment_reaction_created_at_idx ON comment_reaction("createdAt" DESC);
