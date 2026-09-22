-- The thread-starter notifications feed is rooted at the caller's own threads. Without this the
-- planner's only way in is a walk of every comment_thread row.
CREATE INDEX comment_thread_created_by_idx ON comment_thread("createdBy");
