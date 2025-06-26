CREATE TABLE "group" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "inviteSecret" TEXT,
  "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  "updatedAt" BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE INDEX "group_inviteSecret_idx" ON "group" ("inviteSecret");

CREATE TABLE "group_user" (
  "userId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "createdAt" BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  "updatedAt" BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  "role" TEXT NOT NULL CHECK ("role" IN ('admin', 'owner')),
  "userName" TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  PRIMARY KEY ("userId", "groupId"),
  FOREIGN KEY ("userId") REFERENCES public."user" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("groupId") REFERENCES public."group" ("id") ON DELETE CASCADE
);

-- When the user's name or email is updated, update the userName and userEmail columns in the group_user table
CREATE OR REPLACE FUNCTION update_group_user_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "group_user"
  SET "userName" = NEW.name,
      "userEmail" = NEW.email
  WHERE "userId" = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- When a group_user is inserted or updated, update the userName and userEmail columns
CREATE OR REPLACE FUNCTION set_group_user_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "group_user"
  SET "userName" = u."name",
      "userEmail" = u."email"
  FROM public."user" u
  WHERE u."id" = NEW."userId" AND "group_user"."userId" = NEW."userId" AND "group_user"."groupId" = NEW."groupId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- When the user's name or email is updated, update the userName and userEmail columns in the group_user table
CREATE TRIGGER "update_group_user_details_trigger"
AFTER UPDATE OF "name", "email" ON public."user"
FOR EACH ROW
WHEN (OLD."name" IS DISTINCT FROM NEW."name" OR OLD."email" IS DISTINCT FROM NEW."email")
EXECUTE FUNCTION update_group_user_details();

-- When a group_user is inserted or updated, update the userName and userEmail columns
CREATE TRIGGER "set_group_user_details_trigger"
AFTER INSERT OR UPDATE OF "userId" ON "group_user"
FOR EACH ROW
EXECUTE FUNCTION set_group_user_details();

CREATE TABLE "user_presence" (
  "sessionId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  -- These are not necessarily unique, as a user can have multiple tabs open.
  -- These are also not necessarily users in our DB since we support guests, who
  -- get a random ID assigned by the client.
  "userId" TEXT NOT NULL,
  "lastActivityAt" BIGINT NOT NULL,
  -- We let the client decide the name and color of the user, so we can support
  -- guests more easily.
  "name" TEXT,
  "color" TEXT,
  PRIMARY KEY ("sessionId", "fileId"),
  FOREIGN KEY ("fileId") REFERENCES public."file" ("id") ON DELETE CASCADE
);

CREATE TABLE "group_file" (
  "fileId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "createdAt" BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  "updatedAt" BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  PRIMARY KEY ("fileId", "groupId"),
  FOREIGN KEY ("fileId") REFERENCES public."file" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("groupId") REFERENCES public."group" ("id") ON DELETE CASCADE
);

ALTER PUBLICATION zero_data ADD TABLE public."group", public."group_user", public."group_file", public."user_presence";

-- Remove ownerId and publishedSlug from file table primary key
ALTER TABLE public."file" DROP CONSTRAINT "file_pkey";
ALTER TABLE public."file" ADD PRIMARY KEY ("id");


ALTER TABLE public."file" ALTER COLUMN "ownerId" DROP NOT NULL;
ALTER TABLE public."file" ADD COLUMN "owningGroupId" TEXT REFERENCES public."group"("id") ON DELETE CASCADE;

-- Add constraint to ensure exactly one of ownerId or owningGroupId is set
-- This prevents files from being owned by both a user and a group simultaneously
-- XOR logic: one must be null and one must be non-null
ALTER TABLE public."file" ADD CONSTRAINT "file_owner_xor_check" 
  CHECK (
    (("ownerId" IS NULL) != ("owningGroupId" IS NULL)) -- XOR: one must be null and one must be non-null
  );

CREATE INDEX "file_owning_group_id_idx" ON public."file" ("owningGroupId");


-- Create a trigger to update file owner details when group name changes
-- This ensures the denormalized ownerName field stays in sync with group name changes
CREATE OR REPLACE FUNCTION update_file_group_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "file"
  SET "ownerName" = NEW.name,
      "ownerAvatar" = ''
  WHERE "owningGroupId" = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to set file owner details when file ownership changes
-- This handles both user ownership and group ownership scenarios
CREATE OR REPLACE FUNCTION set_file_owner_details() RETURNS TRIGGER AS $$
BEGIN
  -- If the file is owned by a user, set user details
  IF NEW."ownerId" IS NOT NULL THEN
    UPDATE "file"
    SET "ownerName" = u."name",
        "ownerAvatar" = u."avatar"
    FROM public."user" u
    WHERE u."id" = NEW."ownerId" AND "file"."id" = NEW."id";
  END IF;
  
  -- If the file is owned by a group, set group details
  IF NEW."owningGroupId" IS NOT NULL THEN
    UPDATE "file"
    SET "ownerName" = g."name",
        "ownerAvatar" = ''
    FROM public."group" g
    WHERE g."id" = NEW."owningGroupId" AND "file"."id" = NEW."id";
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update file owner details when group name is updated
CREATE TRIGGER "update_file_group_details_trigger"
AFTER UPDATE OF "name" ON public."group"
FOR EACH ROW
WHEN (OLD."name" IS DISTINCT FROM NEW."name")
EXECUTE FUNCTION update_file_group_details();

-- Create a trigger to set file owner details when file ownership changes
CREATE OR REPLACE TRIGGER "set_file_owner_details_trigger"
AFTER INSERT OR UPDATE OF "ownerId", "owningGroupId" ON "file"
FOR EACH ROW
EXECUTE FUNCTION set_file_owner_details();

-- Create a function to clean up related records when a file is marked as deleted
CREATE OR REPLACE FUNCTION cleanup_deleted_file() RETURNS TRIGGER AS $$
BEGIN
  -- Delete any file states for this file
  DELETE FROM "file_state"
  WHERE "fileId" = NEW."id";
  
  -- Delete any group file associations for this file
  DELETE FROM "group_file" 
  WHERE "fileId" = NEW."id";
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to clean up related records when a file is marked as deleted
CREATE TRIGGER "cleanup_deleted_file_trigger"
AFTER UPDATE OF "isDeleted" ON public."file"
FOR EACH ROW
WHEN (OLD."isDeleted" = false AND NEW."isDeleted" = true)
EXECUTE FUNCTION cleanup_deleted_file();

-- Let's delete all the dangling file_state records (there should only be a handful, I already
-- deleted the rows manually in prod)
WITH dangling_file_states AS (
  SELECT fs."fileId", fs."userId"
  FROM public."file" f INNER JOIN public."file_state" fs ON f."id" = fs."fileId"
  WHERE f."isDeleted" = true
)
DELETE FROM public."file_state"
WHERE ("fileId", "userId") IN (SELECT "fileId", "userId" FROM dangling_file_states);

-- Create a function to clean up group associations when a group is marked as deleted
CREATE OR REPLACE FUNCTION cleanup_deleted_group() RETURNS TRIGGER AS $$
BEGIN
  -- Delete all group_user associations for this group
  DELETE FROM "group_user"
  WHERE "groupId" = NEW."id";
  
  -- Delete all group_file associations for this group
  DELETE FROM "group_file"
  WHERE "groupId" = NEW."id";

  -- Mark all files owned by this group as deleted
  UPDATE "file"
  SET "isDeleted" = true
  WHERE "owningGroupId" = NEW."id";
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to clean up group associations when a group is marked as deleted
CREATE TRIGGER "cleanup_deleted_group_trigger"
AFTER UPDATE OF "isDeleted" ON public."group"
FOR EACH ROW
WHEN (OLD."isDeleted" = false AND NEW."isDeleted" = true)
EXECUTE FUNCTION cleanup_deleted_group();

-- Create a function to clean up file states when a user leaves a group
-- This removes access to non-shared files that are owned by the group the user just left
CREATE OR REPLACE FUNCTION cleanup_group_user_file_states() RETURNS TRIGGER AS $$
BEGIN
  -- Delete file_state records for files that are:
  -- 1. Owned by the group the user just left (OLD.groupId)
  -- 2. Not shared (so the user no longer has access)
  DELETE FROM "file_state"
  WHERE "userId" = OLD."userId"
    AND "fileId" IN (
      SELECT "id" FROM "file" 
      WHERE "owningGroupId" = OLD."groupId" 
        AND "shared" = false
    );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to clean up file states when a user leaves a group
CREATE TRIGGER "cleanup_group_user_file_states_trigger"
AFTER DELETE ON public."group_user"
FOR EACH ROW
EXECUTE FUNCTION cleanup_group_user_file_states();

-- Create a function to clean up user presence when files are deleted
CREATE OR REPLACE FUNCTION cleanup_user_presence() RETURNS TRIGGER AS $$
BEGIN
  -- Delete any user presence records for this file
  DELETE FROM "user_presence"
  WHERE "fileId" = NEW."id";
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to clean up user presence when files are marked as deleted
CREATE TRIGGER "cleanup_user_presence_trigger"
AFTER UPDATE OF "isDeleted" ON public."file"
FOR EACH ROW
WHEN (OLD."isDeleted" = false AND NEW."isDeleted" = true)
EXECUTE FUNCTION cleanup_user_presence();

-- Create a function to clean up user presence when users lose access to files
CREATE OR REPLACE FUNCTION cleanup_user_presence_on_access_loss() RETURNS TRIGGER AS $$
BEGIN
  -- Delete presence records for files that are:
  -- 1. Not shared (so the user no longer has access)
  -- 2. Not owned by the user
  -- 3. Not owned by a group the user is a member of
  DELETE FROM "user_presence"
  WHERE "userId" = OLD."userId"
    AND "fileId" IN (
      SELECT f."id" FROM "file" f
      WHERE f."shared" = false
        AND f."ownerId" != OLD."userId"
        AND (f."owningGroupId" IS NULL OR f."owningGroupId" NOT IN (
          SELECT gu."groupId" FROM "group_user" gu WHERE gu."userId" = OLD."userId"
        ))
    );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to clean up user presence when file_state is deleted (user loses access)
CREATE TRIGGER "cleanup_user_presence_on_access_loss_trigger"
AFTER DELETE ON public."file_state"
FOR EACH ROW
EXECUTE FUNCTION cleanup_user_presence_on_access_loss();

-- Create a function to update the updatedAt timestamp for group tables
CREATE OR REPLACE FUNCTION update_group_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = EXTRACT(EPOCH FROM NOW()) * 1000;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update the updatedAt timestamp for group_user table
CREATE OR REPLACE FUNCTION update_group_user_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = EXTRACT(EPOCH FROM NOW()) * 1000;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update the updatedAt timestamp for group_file table
CREATE OR REPLACE FUNCTION update_group_file_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = EXTRACT(EPOCH FROM NOW()) * 1000;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update timestamps
CREATE TRIGGER "update_group_timestamp_trigger"
BEFORE UPDATE ON public."group"
FOR EACH ROW
EXECUTE FUNCTION update_group_timestamp();

CREATE TRIGGER "update_group_user_timestamp_trigger"
BEFORE UPDATE ON public."group_user"
FOR EACH ROW
EXECUTE FUNCTION update_group_user_timestamp();

CREATE TRIGGER "update_group_file_timestamp_trigger"
BEFORE UPDATE ON public."group_file"
FOR EACH ROW
EXECUTE FUNCTION update_group_file_timestamp();

-- Create a function to validate group_file associations
CREATE OR REPLACE FUNCTION validate_group_file_association() RETURNS TRIGGER AS $$
BEGIN
  -- Check that the file is either shared or owned by the group
  -- This prevents linking private files that the group doesn't own
  IF NOT EXISTS (
    SELECT 1 FROM "file" f
    WHERE f."id" = NEW."fileId"
      AND (f."shared" = true OR f."owningGroupId" = NEW."groupId")
  ) THEN
    RAISE EXCEPTION 'Cannot link file to group: file must be shared or owned by the group';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to validate group_file associations before insertion
CREATE TRIGGER "validate_group_file_association_trigger"
BEFORE INSERT ON public."group_file"
FOR EACH ROW
EXECUTE FUNCTION validate_group_file_association();



