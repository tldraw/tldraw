-- Emoji reactions on comments, written by the file's Durable Object from the room's
-- comment-reaction records (see TLCommentReaction in tlschema). Same contract as comment and
-- comment_thread: Postgres is the sole durable store, the columns carry every record field so the
-- Durable Object can rebuild the records from rows alone on cold start, and `lastChangedClock`
-- preserves each record's sync clock and guards upserts against no-op replays.
--
-- A reaction is its own row rather than a column on comment because it is one user's data about
-- someone else's comment — the same reason comment_read is its own table. It keeps every write
-- scoped to one user's own record, so concurrent reactions from different people can't overwrite
-- each other, and a user can never write a reaction attributed to anyone else.
--
-- `meta` and `lastChangedClock` are persistence/rehydration columns not declared in the Zero
-- schema, so they never reach clients.

CREATE TABLE comment_reaction (
  "id" VARCHAR PRIMARY KEY,
  "fileId" VARCHAR NOT NULL,
  "commentId" VARCHAR NOT NULL,
  "threadId" VARCHAR NOT NULL,
  "pageId" VARCHAR NOT NULL,
  "userId" VARCHAR NOT NULL,
  "emoji" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "meta" JSONB NOT NULL,
  "lastChangedClock" BIGINT NOT NULL,
  CONSTRAINT comment_reaction_file_id_fkey FOREIGN KEY ("fileId") REFERENCES public."file"("id") ON DELETE CASCADE,
  CONSTRAINT comment_reaction_comment_id_fkey FOREIGN KEY ("commentId") REFERENCES public."comment"("id") ON DELETE CASCADE,
  CONSTRAINT comment_reaction_thread_id_fkey FOREIGN KEY ("threadId") REFERENCES public."comment_thread"("id") ON DELETE CASCADE,
  -- deleting a user removes their reactions, never the comment they reacted to
  CONSTRAINT comment_reaction_user_id_fkey FOREIGN KEY ("userId") REFERENCES public."user"("id") ON DELETE CASCADE,
  -- one record per (comment, user, emoji): a user may hold multiple reactions on a comment (one
  -- per emoji), but not the same emoji twice. The record id is derived from the same triple
  -- (createCommentReactionId), so this backstops the invariant at the database.
  CONSTRAINT comment_reaction_comment_user_emoji_unique UNIQUE ("commentId", "userId", "emoji")
);

CREATE INDEX comment_reaction_file_id_idx ON comment_reaction("fileId");
CREATE INDEX comment_reaction_comment_id_idx ON comment_reaction("commentId");
CREATE INDEX comment_reaction_thread_id_idx ON comment_reaction("threadId");
-- covers the user-delete cascade path
CREATE INDEX comment_reaction_user_id_idx ON comment_reaction("userId");

ALTER PUBLICATION zero_data ADD TABLE public."comment_reaction";
