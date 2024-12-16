-- Purpose: Add a column to the file_state table that indicates whether the user is the owner of the file.

ALTER TABLE file_state
ADD COLUMN "isFileOwner" BOOLEAN;

-- To make sure it is always up to date, we add two triggers:

-- When the file_state table is updated, we want to check if the user is the owner of the file

CREATE OR REPLACE FUNCTION update_is_file_owner() RETURNS TRIGGER AS $$
BEGIN
  NEW."isFileOwner" := (NEW."userId" = (SELECT "ownerId" FROM file WHERE file.id = NEW."fileId"));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_is_file_owner
BEFORE INSERT OR UPDATE ON file_state
FOR EACH ROW EXECUTE FUNCTION update_is_file_owner();

-- When the file table is updated, we want to check if the user is the owner of the file

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