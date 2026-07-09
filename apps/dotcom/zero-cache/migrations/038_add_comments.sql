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
  -- no FK to "user": deleting a user must not cascade-delete threads (and thereby other
  -- authors' comments); the comment table's authorId FK handles per-author cleanup
  "createdBy" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "meta" JSONB NOT NULL,
  "lastChangedClock" BIGINT NOT NULL,
  CONSTRAINT comment_thread_file_id_fkey FOREIGN KEY ("fileId") REFERENCES public."file"("id") ON DELETE CASCADE
);

CREATE INDEX comment_thread_file_id_idx ON comment_thread("fileId");

CREATE TABLE comment (
  "id" VARCHAR PRIMARY KEY,
  "fileId" VARCHAR NOT NULL,
  "threadId" VARCHAR NOT NULL,
  "pageId" VARCHAR NOT NULL,
  "authorId" VARCHAR NOT NULL,
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

ALTER PUBLICATION zero_data ADD TABLE public."comment_thread";
ALTER PUBLICATION zero_data ADD TABLE public."comment";
