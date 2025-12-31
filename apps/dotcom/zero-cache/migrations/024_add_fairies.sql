
CREATE TABLE user_fairies (
  "userId" VARCHAR PRIMARY KEY,
  "fairies" VARCHAR,
  CONSTRAINT user_fairies_user_id_fkey FOREIGN KEY ("userId") REFERENCES public."user"("id") ON DELETE CASCADE
);

CREATE TABLE file_fairies (
  "fileId" VARCHAR,
  "userId" VARCHAR,
  "fairyState" VARCHAR,
  PRIMARY KEY ("fileId", "userId"),
  CONSTRAINT file_fairies_file_id_fkey FOREIGN KEY ("fileId") REFERENCES public."file"("id") ON DELETE CASCADE,
  CONSTRAINT file_fairies_user_id_fkey FOREIGN KEY ("userId") REFERENCES public."user"("id") ON DELETE CASCADE
);
