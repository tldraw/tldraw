
CREATE TABLE file_fairy_messages (
  "id" VARCHAR PRIMARY KEY,
  "fileId" VARCHAR NOT NULL,
  "userId" VARCHAR NOT NULL,
  "message" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  CONSTRAINT file_fairy_messages_file_id_fkey FOREIGN KEY ("fileId") REFERENCES public."file"("id") ON DELETE CASCADE,
  CONSTRAINT file_fairy_messages_user_id_fkey FOREIGN KEY ("userId") REFERENCES public."user"("id") ON DELETE CASCADE
);

CREATE INDEX file_fairy_messages_file_user_idx ON file_fairy_messages("fileId", "userId");
