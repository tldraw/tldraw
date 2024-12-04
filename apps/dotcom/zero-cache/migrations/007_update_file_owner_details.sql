ALTER TABLE "file"
ADD COLUMN "ownerName" VARCHAR DEFAULT '' NOT NULL;
ALTER TABLE "file"
ADD COLUMN "ownerAvatar" VARCHAR DEFAULT '' NOT NULL;

UPDATE "file"
SET "ownerName" = u."name",
    "ownerAvatar" = u."avatar"
FROM public."user" u
WHERE u."id" = "file"."ownerId";

CREATE OR REPLACE FUNCTION update_file_owner_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "file"
  SET "ownerName" = NEW.name,
      "ownerAvatar" = NEW.avatar
  WHERE "ownerId" = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_file_owner_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "file"
  SET "ownerName" = u."name",
      "ownerAvatar" = u."avatar"
  FROM public."user" u
  WHERE u."id" = NEW."ownerId" AND "file"."id" = NEW."id";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "update_file_owner_details_trigger"
AFTER UPDATE OF "name", "avatar" ON public."user"
FOR EACH ROW
WHEN (OLD."name" IS DISTINCT FROM NEW."name" OR OLD."avatar" IS DISTINCT FROM NEW."avatar")
EXECUTE FUNCTION update_file_owner_details();

CREATE TRIGGER "set_file_owner_details_trigger"
AFTER INSERT OR UPDATE OF "ownerId" ON "file"
FOR EACH ROW
EXECUTE FUNCTION set_file_owner_details();