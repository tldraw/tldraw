-- Per-comment @-mention rows, one per (comment, mentioned user), extracted from the comment's
-- rich-text body by the file's Durable Object when it drains comment records to Postgres (see
-- extractMentionIds / drainCommentOutbox in sync-worker). Mentions live inside the body JSON as
-- TipTap mention nodes, which ZQL cannot reach, so this table is what lets the app-level
-- notifications query filter "comments that mention me" server-side. Server-written only, like
-- comment/comment_thread; rows are reconciled on every comment upsert and cascade away with
-- their comment.

CREATE TABLE comment_mention (
  "commentId" VARCHAR NOT NULL,
  "userId" VARCHAR NOT NULL,
  PRIMARY KEY ("commentId", "userId"),
  CONSTRAINT comment_mention_comment_id_fkey FOREIGN KEY ("commentId") REFERENCES public."comment"("id") ON DELETE CASCADE,
  -- deleting a mentioned user only removes their mention rows, never the comment itself
  CONSTRAINT comment_mention_user_id_fkey FOREIGN KEY ("userId") REFERENCES public."user"("id") ON DELETE CASCADE
);

-- covers the "comments that mention this user" lookup and the user-delete cascade path
CREATE INDEX comment_mention_user_id_idx ON comment_mention("userId");

-- Backfill from existing comment bodies: `$.**` recursively finds mention nodes wherever they
-- nest; DISTINCT collapses the multiple paths lax mode can reach a node through (and repeat
-- mentions); the user join drops ids that aren't users (deleted accounts, malformed ids) —
-- mirroring the FK-violation skip in the Durable Object's drain.
INSERT INTO comment_mention ("commentId", "userId")
SELECT DISTINCT c."id", u."id"
FROM comment c
CROSS JOIN LATERAL jsonb_path_query(c."body", 'lax $.** ? (@.type == "mention").attrs.id') AS mention(id)
JOIN public."user" u ON u."id" = (mention.id #>> '{}');

ALTER PUBLICATION zero_data ADD TABLE public."comment_mention";
