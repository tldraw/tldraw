-- Per-user comment read receipts for the app-level /comments view. Row present = the user has
-- read the comment; marking unread deletes the row. `readAt` is stored so a future "edited
-- comments become unread again" rule (readAt < updatedAt) is a client-only change. Authors'
-- own comments get no row: the client treats authorId === me as implicitly read. Written via
-- Zero custom mutators (comment.markRead / comment.markUnread), unlike comment/comment_thread
-- which are written by the file's Durable Object.

CREATE TABLE comment_read (
  "userId" VARCHAR NOT NULL,
  "commentId" VARCHAR NOT NULL,
  "readAt" BIGINT NOT NULL,
  PRIMARY KEY ("userId", "commentId"),
  CONSTRAINT comment_read_user_id_fkey FOREIGN KEY ("userId") REFERENCES public."user"("id") ON DELETE CASCADE,
  CONSTRAINT comment_read_comment_id_fkey FOREIGN KEY ("commentId") REFERENCES public."comment"("id") ON DELETE CASCADE
);

-- covers the cascade path when comments are deleted
CREATE INDEX comment_read_comment_id_idx ON comment_read("commentId");

ALTER PUBLICATION zero_data ADD TABLE public."comment_read";
