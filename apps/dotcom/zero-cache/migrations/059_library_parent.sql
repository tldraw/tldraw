-- Libraries inside libraries: a library names the one it is inside, or none at the top level. A
-- library and everything inside it belong to one workspace, kept the same on every row
-- ("owningGroupId"), so the libraries query and the permission checks stay per row and never walk
-- up the tree. Deleting a library deletes the libraries inside it, whose items go by the
-- library_item foreign key cascade, each still queuing its R2 cleanup through the delete trigger
-- (056).

ALTER TABLE library
  ADD COLUMN "parentLibraryId" VARCHAR
  CONSTRAINT library_parent_library_id_fkey REFERENCES public."library"("id") ON DELETE CASCADE;

CREATE INDEX library_parent_library_id_idx ON library("parentLibraryId");
