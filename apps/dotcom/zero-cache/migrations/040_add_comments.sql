-- Comments for app files, written by the file's Durable Object from the room's comment records
-- (see TLComment / TLCommentThread in tlschema). Postgres is the sole durable store for comment
-- records: the columns collectively carry every record field, so the Durable Object can rebuild
-- its room's comment records from rows alone on cold start. `lastChangedClock` preserves each
-- record's sync clock across reloads and guards upserts against no-op replays (an update that
-- doesn't advance the clock is skipped, producing no WAL entry for Zero). `anchor`, `meta`,
-- `resolvedBy`, `editedAt`, and `lastChangedClock` are persistence/rehydration columns not
-- declared in the Zero schema, so they never reach clients.

CREATE TABLE comment_thread (
  "id" VARCHAR PRIMARY KEY,
  "fileId" VARCHAR NOT NULL,
  "pageId" VARCHAR NOT NULL,
  -- the thread's TLCommentAnchor (discriminated union) as JSON — canonical, used to rebuild the record
  "anchor" JSONB NOT NULL,
  -- denormalized from anchor for queries; only set for shape-anchored threads
  "shapeId" VARCHAR,
  "resolvedAt" BIGINT,
  "resolvedBy" VARCHAR,
  -- soft-deletion stamp (see TLCommentThread.deleted): threads are never hard-deleted by
  -- clients, so the row (and its comments) stays for recovery while room loads and Zero
  -- queries filter it out. deletedAt is Zero-visible for query filtering; deletedBy is a
  -- persistence-only rehydration column like resolvedBy
  "deletedAt" BIGINT,
  "deletedBy" VARCHAR,
  -- no FK to "user": deleting a user must not cascade-delete threads (and thereby other
  -- authors' comments); the comment table's authorId FK handles per-author cleanup
  "createdBy" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "meta" JSONB NOT NULL,
  "lastChangedClock" BIGINT NOT NULL,
  CONSTRAINT comment_thread_file_id_fkey FOREIGN KEY ("fileId") REFERENCES public."file"("id") ON DELETE CASCADE,
  -- resolvedAt/resolvedBy encode one nullable `resolved` record field, so they must be set or
  -- null together; rehydration (rowToThreadRecord) relies on resolvedBy being non-null whenever
  -- resolvedAt is
  CONSTRAINT comment_thread_resolved_check CHECK (("resolvedAt" IS NULL) = ("resolvedBy" IS NULL)),
  -- same pairing rule as resolvedAt/resolvedBy: rowToThreadRecord relies on deletedBy being
  -- non-null whenever deletedAt is
  CONSTRAINT comment_thread_deleted_check CHECK (("deletedAt" IS NULL) = ("deletedBy" IS NULL))
);

CREATE INDEX comment_thread_file_id_idx ON comment_thread("fileId");

CREATE TABLE comment (
  "id" VARCHAR PRIMARY KEY,
  "fileId" VARCHAR NOT NULL,
  "threadId" VARCHAR NOT NULL,
  "pageId" VARCHAR NOT NULL,
  "authorId" VARCHAR NOT NULL,
  -- author display fields, denormalized from the user table by the triggers below (same
  -- pattern as file."ownerName") — joining the user row would sync private fields to readers
  "authorName" VARCHAR DEFAULT '' NOT NULL,
  "authorColor" VARCHAR DEFAULT '' NOT NULL,
  "authorAvatar" VARCHAR DEFAULT '' NOT NULL,
  "body" JSONB NOT NULL,
  "createdAt" BIGINT NOT NULL,
  -- null until first edited (exact record field; updatedAt below is the derived sort key)
  "editedAt" BIGINT,
  "updatedAt" BIGINT NOT NULL,
  "meta" JSONB NOT NULL,
  "lastChangedClock" BIGINT NOT NULL,
  CONSTRAINT comment_file_id_fkey FOREIGN KEY ("fileId") REFERENCES public."file"("id") ON DELETE CASCADE,
  CONSTRAINT comment_author_id_fkey FOREIGN KEY ("authorId") REFERENCES public."user"("id") ON DELETE CASCADE,
  CONSTRAINT comment_thread_id_fkey FOREIGN KEY ("threadId") REFERENCES public."comment_thread"("id") ON DELETE CASCADE
);

CREATE INDEX comment_file_id_idx ON comment("fileId");
CREATE INDEX comment_thread_id_idx ON comment("threadId");
CREATE INDEX comment_author_id_idx ON comment("authorId");

-- Stamp author details on insert — the Durable Object only knows authorId. BEFORE INSERT
-- keeps it a single write with no extra WAL entry for Zero.
CREATE OR REPLACE FUNCTION set_comment_author_details() RETURNS TRIGGER AS $$
DECLARE
  author_name VARCHAR;
  author_color VARCHAR;
  author_avatar VARCHAR;
BEGIN
  SELECT u."name", u."color", u."avatar" INTO author_name, author_color, author_avatar
  FROM public."user" u
  WHERE u."id" = NEW."authorId";
  -- a missing user row keeps the defaults, so the insert still fails its author FK check
  -- (see isCommentAuthorFkViolation) rather than erroring here
  IF FOUND THEN
    NEW."authorName" := author_name;
    NEW."authorColor" := author_color;
    NEW."authorAvatar" := author_avatar;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "set_comment_author_details_trigger"
BEFORE INSERT OR UPDATE OF "authorId" ON comment
FOR EACH ROW
EXECUTE FUNCTION set_comment_author_details();

-- Propagate user renames, recolors, and avatar changes to their existing comments.
CREATE OR REPLACE FUNCTION update_comment_author_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE comment
  SET "authorName" = NEW."name",
      "authorColor" = NEW."color",
      "authorAvatar" = NEW."avatar"
  WHERE "authorId" = NEW."id";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "update_comment_author_details_trigger"
AFTER UPDATE OF "name", "color", "avatar" ON public."user"
FOR EACH ROW
WHEN (OLD."name" IS DISTINCT FROM NEW."name" OR OLD."color" IS DISTINCT FROM NEW."color" OR OLD."avatar" IS DISTINCT FROM NEW."avatar")
EXECUTE FUNCTION update_comment_author_details();

ALTER PUBLICATION zero_data ADD TABLE public."comment_thread";
ALTER PUBLICATION zero_data ADD TABLE public."comment";
