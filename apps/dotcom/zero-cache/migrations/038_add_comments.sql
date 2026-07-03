-- Comments projected from the file room's comment records (see TLComment) by the file Durable
-- Object. Zero replicates these per user so an app-level, cross-document view can query them. The
-- authoritative comment content lives in the file's R2 comment lane; these rows are a derived copy.
-- `body` is the comment's rich text (TLRichText JSON) — the projection preserves the authoritative
-- representation; consumers flatten to plaintext for display where needed.
CREATE TABLE comment (
  "id" VARCHAR PRIMARY KEY,
  "fileId" VARCHAR NOT NULL,
  "authorId" VARCHAR NOT NULL,
  "shapeId" VARCHAR NOT NULL,
  "body" JSONB NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  CONSTRAINT comment_file_id_fkey FOREIGN KEY ("fileId") REFERENCES public."file"("id") ON DELETE CASCADE,
  CONSTRAINT comment_author_id_fkey FOREIGN KEY ("authorId") REFERENCES public."user"("id") ON DELETE CASCADE
);

CREATE INDEX comment_file_id_idx ON comment("fileId");
CREATE INDEX comment_author_id_idx ON comment("authorId");

-- Replicate to Zero (matches how 023_groups.sql added the group tables).
ALTER PUBLICATION zero_data ADD TABLE public."comment";
