CREATE OR REPLACE FUNCTION update_file_state_on_file_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD."ownerId" IS DISTINCT FROM NEW."ownerId" THEN
    UPDATE file_state
    SET "isFileOwner" = (file_state."userId" = NEW."ownerId")
    WHERE file_state."fileId" = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION update_is_file_owner() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW."isFileOwner" := (NEW."userId" = (SELECT "ownerId" FROM file WHERE file.id = NEW."fileId"));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW."userId" IS DISTINCT FROM OLD."userId" THEN
      NEW."isFileOwner" := (NEW."userId" = (SELECT "ownerId" FROM file WHERE file.id = NEW."fileId"));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
