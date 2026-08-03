-- The notifications feed (the `comments` query in dotcom-shared) orders by createdAt DESC with a
-- row limit, but 040 only indexed fileId/threadId/authorId, so every evaluation sorts from scratch.
CREATE INDEX comment_created_at_idx ON comment("createdAt" DESC);
