-- This file adds a column to the file_state table that indicates whether the user is the owner of the file.
-- To make sure it is always up to date, we add two triggers that update the column when the file or file_state table is updated.

BEGIN;

ALTER TABLE file_state
ADD COLUMN "isFileOwner" BOOLEAN;

CREATE OR REPLACE FUNCTION update_is_file_owner() RETURNS TRIGGER AS $$
BEGIN
  NEW."isFileOwner" := (NEW."userId" = (SELECT "ownerId" FROM file WHERE file.id = NEW."fileId"));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_is_file_owner
BEFORE INSERT OR UPDATE ON file_state
FOR EACH ROW EXECUTE FUNCTION update_is_file_owner();

CREATE OR REPLACE FUNCTION update_file_state_on_file_change() RETURNS TRIGGER AS $$
BEGIN
  UPDATE file_state
  SET "isFileOwner" = (file_state."userId" = NEW."ownerId")
  WHERE file_state."fileId" = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_file_state_on_file_change
AFTER UPDATE ON file
FOR EACH ROW EXECUTE FUNCTION update_file_state_on_file_change();

-- popluating the isFileOwner column with no-op update
UPDATE file_state
SET "userId" = file_state."userId";

COMMIT;