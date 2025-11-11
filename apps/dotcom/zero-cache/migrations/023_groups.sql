----------------------------------
--- CREATE NEW DATA MODEL BITS ---
----------------------------------

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
  -- index for the user's own sidebar group ordering
  "index" TEXT NOT NULL,
  -- 'computed' name and color fields are populated by a trigger to share
  -- some of the user's details with the other group members
  "userName" TEXT NOT NULL,
  "userColor" TEXT NOT NULL DEFAULT '#000000',
  PRIMARY KEY ("userId", "groupId"),
  FOREIGN KEY ("userId") REFERENCES public."user" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("groupId") REFERENCES public."group" ("id") ON DELETE CASCADE
);

CREATE TABLE "group_file" (
  "fileId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "createdAt" BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  "updatedAt" BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  "index" TEXT,
  PRIMARY KEY ("fileId", "groupId"),
  FOREIGN KEY ("fileId") REFERENCES public."file" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("groupId") REFERENCES public."group" ("id") ON DELETE CASCADE
);

-- add owningGroupId column
ALTER TABLE public."file" ADD COLUMN "owningGroupId" TEXT REFERENCES public."group" ("id") ON DELETE CASCADE;

-- When the user's name or color is updated, update the userName and userColor columns in the group_user table
CREATE OR REPLACE FUNCTION update_group_user_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "group_user"
  SET "userName" = NEW.name,
      "userColor" = COALESCE(NEW.color, '#000000')
  WHERE "userId" = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- When a group_user is inserted or updated, update the userName and userColor columns
CREATE OR REPLACE FUNCTION set_group_user_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "group_user"
  SET "userName" = u."name",
      "userColor" = COALESCE(u."color", '#000000')
  FROM public."user" u
  WHERE u."id" = NEW."userId" AND "group_user"."userId" = NEW."userId" AND "group_user"."groupId" = NEW."groupId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- When the user's name or color is updated, update the userName and userColor columns in the group_user table
CREATE TRIGGER "update_group_user_details_trigger"
AFTER UPDATE OF "name", "color" ON public."user"
FOR EACH ROW
WHEN (OLD."name" IS DISTINCT FROM NEW."name" OR OLD."color" IS DISTINCT FROM NEW."color")
EXECUTE FUNCTION update_group_user_details();

-- When a group_user is inserted or updated, update the userName and userEmail columns
CREATE TRIGGER "set_group_user_details_trigger"
AFTER INSERT OR UPDATE OF "userId" ON "group_user"
FOR EACH ROW
EXECUTE FUNCTION set_group_user_details();

ALTER PUBLICATION zero_data ADD TABLE public."group", public."group_user", public."group_file";

-- Remove ownerId and publishedSlug from file table primary key
ALTER TABLE public."file" DROP CONSTRAINT "file_pkey";
ALTER TABLE public."file" ADD PRIMARY KEY ("id");

ALTER TABLE public."file" ALTER COLUMN "ownerId" DROP NOT NULL;

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

-- Create a function to sync home group name with user name on update
-- When a user's name is updated, update the corresponding home group's name
CREATE OR REPLACE FUNCTION update_home_group_name() RETURNS TRIGGER AS $$
BEGIN
  -- Update the group name where the group id matches the user id (home group)
  UPDATE "group"
  SET "name" = NEW.name
  WHERE "id" = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to sync home group name when user name is updated
CREATE TRIGGER "update_home_group_name_trigger"
AFTER UPDATE OF "name" ON public."user"
FOR EACH ROW
WHEN (OLD."name" IS DISTINCT FROM NEW."name")
EXECUTE FUNCTION update_home_group_name();

-- Create a function to initialize group name from user name on group creation
-- When a group is created with an id matching a user id, set the group name to the user's name
CREATE OR REPLACE FUNCTION initialize_home_group_name() RETURNS TRIGGER AS $$
BEGIN
  -- If there's a user with the same id as the group, update the group name to match
  UPDATE "group"
  SET "name" = u."name"
  FROM public."user" u
  WHERE u."id" = NEW."id" AND "group"."id" = NEW."id";
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to initialize group name from user name on group creation
CREATE TRIGGER "initialize_home_group_name_trigger"
AFTER INSERT ON public."group"
FOR EACH ROW
EXECUTE FUNCTION initialize_home_group_name();

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

-- ownerId becomes nullable so we need to update the file_state updater fns to handle NULLs
CREATE OR REPLACE FUNCTION update_file_state_on_file_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD."ownerId" IS DISTINCT FROM NEW."ownerId" THEN
    UPDATE file_state
    SET "isFileOwner" = COALESCE(file_state."userId" = NEW."ownerId", FALSE)
    WHERE file_state."fileId" = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_is_file_owner() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW."isFileOwner" := COALESCE(NEW."userId" = (SELECT "ownerId" FROM file WHERE file.id = NEW."fileId"), FALSE);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW."userId" IS DISTINCT FROM OLD."userId" THEN
      NEW."isFileOwner" := COALESCE(NEW."userId" = (SELECT "ownerId" FROM file WHERE file.id = NEW."fileId"), FALSE);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Migration function to move a user from legacy file_state-based model to group_file-based model
-- Usage: SELECT migrate_user_to_groups('user-id-here');
CREATE OR REPLACE FUNCTION migrate_user_to_groups(target_user_id TEXT, invite_secret TEXT)
RETURNS TABLE (
    files_migrated INTEGER,
    pinned_files_migrated INTEGER,
    flag_added BOOLEAN
) AS $$
DECLARE
    v_files_migrated INTEGER := 0;
    v_pinned_files_migrated INTEGER := 0;
    v_current_flags TEXT;
    v_file_record RECORD;
    v_now BIGINT := EXTRACT(EPOCH FROM NOW()) * 1000;
    v_lock_key BIGINT;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM public."user" WHERE id = target_user_id) THEN
      RAISE EXCEPTION 'User % does not exist', target_user_id;
    END IF;

    -- Check if user already has groups flag
    SELECT flags INTO v_current_flags FROM public."user" WHERE id = target_user_id;
    IF v_current_flags LIKE '%groups_backend%' THEN
      RAISE NOTICE 'User % already has groups flag, skipping migration', target_user_id;
      RETURN QUERY SELECT 0, 0, FALSE;
      RETURN;
    END IF;

    -- Acquire an advisory lock based on the user ID to prevent mutations during migration
    -- Convert user ID string to a bigint for the lock key using hashtext
    -- Using xact lock so it's automatically released when transaction ends
    v_lock_key := hashtext(target_user_id);
    RAISE NOTICE 'Acquiring advisory lock % for user %', v_lock_key, target_user_id;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Lock acquired, now we can safely migrate
    RAISE NOTICE 'Lock acquired, starting migration for user %', target_user_id;

    -- Create a home group for the user
    INSERT INTO public."group" ("id", "name", "createdAt", "updatedAt", "isDeleted", "inviteSecret")
    VALUES (target_user_id, target_user_id, v_now, v_now, FALSE, invite_secret)
    ON CONFLICT DO NOTHING;

    -- Make the user a member of the home group
    INSERT INTO public."group_user" ("userId", "groupId", "createdAt", "updatedAt", "role", "index", "userName", "userColor")
    VALUES (target_user_id, target_user_id, v_now, v_now, 'owner', 'a1', '', '')
    ON CONFLICT DO NOTHING;

    -- For any files owned by the user, change the owningGroupId to the home group and set the ownerId to null
    UPDATE public."file"
    SET "owningGroupId" = target_user_id,
        "ownerId" = NULL
    WHERE "ownerId" = target_user_id;

    -- For any files that the user has access to, create a group_file entry in the home group
    INSERT INTO public."group_file" ("fileId", "groupId", "createdAt", "updatedAt")
    SELECT fs."fileId", target_user_id, COALESCE(fs."firstVisitAt", f."createdAt", v_now), COALESCE(fs."lastEditAt", fs."firstVisitAt", f."updatedAt", f."createdAt", v_now)
    FROM public."file_state" fs JOIN public."file" f ON fs."fileId" = f."id"
    WHERE fs."userId" = target_user_id
    ON CONFLICT DO NOTHING;

    -- Update indexes for the group_file entries
    UPDATE public."group_file" gf
    SET "index" = 'a' || fs.i::text
    FROM (
      SELECT "fileId", ROW_NUMBER() over (ORDER BY COALESCE("lastEditAt", "firstVisitAt", 0) DESC) AS i
      FROM public."file_state"
      WHERE "userId" = target_user_id
        AND "isPinned" = TRUE
    ) AS fs
    WHERE gf."fileId" = fs."fileId" AND gf."groupId" = target_user_id;

    -- Add 'groups_backend' flag to user
    IF v_current_flags IS NULL OR v_current_flags = '' THEN
        UPDATE public."user" SET flags = 'groups_backend' WHERE id = target_user_id;
    ELSE
        UPDATE public."user" SET flags = v_current_flags || ' groups_backend' WHERE id = target_user_id;
    END IF;

    RAISE NOTICE 'Successfully migrated user % to groups model. Files: %, Pinned: %',
                 target_user_id, v_files_migrated, v_pinned_files_migrated;

    RETURN QUERY SELECT v_files_migrated, v_pinned_files_migrated, TRUE;
END;
$$ LANGUAGE plpgsql;
