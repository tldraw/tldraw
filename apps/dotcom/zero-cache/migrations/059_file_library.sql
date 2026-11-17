-- Libraries added to a file. A file's panel shows the libraries added to it, to everyone who can
-- access the file, members of the library's workspace or not; only those who can edit the file
-- add or remove them. Rows go with either the file or the library.

CREATE TABLE file_library (
  "fileId" VARCHAR NOT NULL,
  "libraryId" VARCHAR NOT NULL,
  -- authorship only, and no FK to "user", as library."createdBy" (055)
  "addedBy" VARCHAR NOT NULL,
  "addedAt" BIGINT NOT NULL,
  PRIMARY KEY ("fileId", "libraryId"),
  CONSTRAINT file_library_file_id_fkey FOREIGN KEY ("fileId") REFERENCES public."file"("id") ON DELETE CASCADE,
  CONSTRAINT file_library_library_id_fkey FOREIGN KEY ("libraryId") REFERENCES public."library"("id") ON DELETE CASCADE
);

CREATE INDEX file_library_library_id_idx ON file_library("libraryId");

ALTER PUBLICATION zero_data ADD TABLE public."file_library";

-- A user's default library, shown on every board they open. It lives in their home workspace,
-- whose id is the user's id, so one default per home workspace is one default per user.
ALTER TABLE public."library" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public."library" ADD CONSTRAINT library_default_in_home_workspace
  CHECK (NOT "isDefault" OR "owningGroupId" = "createdBy");

CREATE UNIQUE INDEX library_one_default_per_user_idx ON library("owningGroupId") WHERE "isDefault";
