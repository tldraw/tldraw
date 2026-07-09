-- Comments for app files, written by the file's Durable Object from the room's comment records
-- (see TLComment / TLCommentThread in tlschema). Postgres is the sole durable store for comment
-- records: `record` holds the exact serialized TLRecord so the Durable Object can rehydrate its
-- room on cold start, and `lastChangedClock` preserves the record's sync clock and guards upserts
-- against no-op replays (an update that doesn't advance the clock is skipped, producing no WAL
-- entry for Zero). The other columns are denormalized for app-level Zero queries;
-- `record`/`lastChangedClock` are not declared in the Zero schema, so they never reach clients.

CREATE TABLE comment_thread (
  "id" VARCHAR PRIMARY KEY,
  "fileId" VARCHAR NOT NULL,
  "pageId" VARCHAR NOT NULL,
  -- only set for shape-anchored threads (see TLCommentAnchor); other anchor kinds leave it null
  "shapeId" VARCHAR,
  "resolved" BOOLEAN NOT NULL DEFAULT FALSE,
  -- no FK to "user": deleting a user must not cascade-delete threads (and thereby other
  -- authors' comments); the comment table's authorId FK handles per-author cleanup
  "createdBy" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "record" JSONB NOT NULL,
  "lastChangedClock" BIGINT NOT NULL,
  CONSTRAINT comment_thread_file_id_fkey FOREIGN KEY ("fileId") REFERENCES public."file"("id") ON DELETE CASCADE
);

CREATE INDEX comment_thread_file_id_idx ON comment_thread("fileId");

-- `body` is the comment's rich text (TLRichText JSON) — preserved as-is; consumers flatten to
-- plaintext for display where needed. `threadId`/`pageId` are denormalized from the comment
-- record so the app-level view can group by thread and deep-link to the right page without a
-- join. `shapeId` is only set for shape-anchored threads.
CREATE TABLE comment (
  "id" VARCHAR PRIMARY KEY,
  "fileId" VARCHAR NOT NULL,
  "threadId" VARCHAR NOT NULL,
  "pageId" VARCHAR NOT NULL,
  "authorId" VARCHAR NOT NULL,
  "shapeId" VARCHAR,
  "body" JSONB NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  "record" JSONB NOT NULL,
  "lastChangedClock" BIGINT NOT NULL,
  CONSTRAINT comment_file_id_fkey FOREIGN KEY ("fileId") REFERENCES public."file"("id") ON DELETE CASCADE,
  CONSTRAINT comment_author_id_fkey FOREIGN KEY ("authorId") REFERENCES public."user"("id") ON DELETE CASCADE,
  CONSTRAINT comment_thread_id_fkey FOREIGN KEY ("threadId") REFERENCES public."comment_thread"("id") ON DELETE CASCADE
);

CREATE INDEX comment_file_id_idx ON comment("fileId");
CREATE INDEX comment_thread_id_idx ON comment("threadId");
CREATE INDEX comment_author_id_idx ON comment("authorId");

-- Replicate to Zero (matches how 023_groups.sql added the group tables).
ALTER PUBLICATION zero_data ADD TABLE public."comment_thread";
ALTER PUBLICATION zero_data ADD TABLE public."comment";
