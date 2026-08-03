-- The per-user notifications feed (the `comments` query in dotcom-shared) orders by
-- comment."createdAt" DESC with a row limit, but 040 only indexed fileId/threadId/authorId — so
-- every feed evaluation sorts its candidate rows from scratch. Index the sort column descending
-- to match the query's ORDER BY, so the feed reads rows in order instead of sorting.
CREATE INDEX comment_created_at_idx ON comment("createdAt" DESC);
