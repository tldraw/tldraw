-- Comments are the authoritative store for tldraw.com's comment feature: they are written directly
-- via Zero mutators (createComment/deleteComment) and read back through the `comments` synced query,
-- for both the in-document pins and the cross-document /comments view. v1: shape-anchored, plaintext.
CREATE TABLE comment (
  "id" VARCHAR PRIMARY KEY,
  "fileId" VARCHAR NOT NULL,
  "authorId" VARCHAR NOT NULL,
  "shapeId" VARCHAR NOT NULL,
  "text" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  CONSTRAINT comment_file_id_fkey FOREIGN KEY ("fileId") REFERENCES public."file"("id") ON DELETE CASCADE,
  CONSTRAINT comment_author_id_fkey FOREIGN KEY ("authorId") REFERENCES public."user"("id") ON DELETE CASCADE
);

CREATE INDEX comment_file_id_idx ON comment("fileId");
CREATE INDEX comment_author_id_idx ON comment("authorId");

-- Replicate to Zero (matches how 023_groups.sql added the group tables).
ALTER PUBLICATION zero_data ADD TABLE public."comment";
