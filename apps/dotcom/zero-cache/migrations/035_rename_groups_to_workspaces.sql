-- Rename the groups data model to workspaces.
--
-- The UI already calls groups "workspaces"; this finishes the rename at the data
-- layer: tables (group → workspace, group_user → workspace_user, group_file →
-- workspace_file), columns ("groupId" → "workspaceId", file."owningGroupId" →
-- "owningWorkspaceId"), and the indexes, constraints, triggers, and functions
-- named after them.
--
-- Intentionally NOT renamed:
--   * the user.flags values 'groups_backend' / 'groups_frontend' — they are
--     persisted per-user rollout markers, and rewriting them buys nothing
--     structurally while racing against the not-yet-deployed sync-worker;
--   * migrate_user_to_groups keeps a thin compatibility wrapper (see the end of
--     this file) because the previous sync-worker deployment calls it by name
--     until the new worker ships a few minutes after this migration runs.
--
-- Table renames keep their OIDs, so publication membership (zero_data), FK
-- relationships, grants, and trigger bindings all follow automatically. plpgsql
-- function bodies are stored as text, so every function that mentions a renamed
-- table or column is re-created below with the new names.

------------------------
--- TABLES & COLUMNS ---
------------------------

ALTER TABLE public."group" RENAME TO "workspace";
ALTER TABLE public."group_user" RENAME TO "workspace_user";
ALTER TABLE public."group_file" RENAME TO "workspace_file";

ALTER TABLE public."workspace_user" RENAME COLUMN "groupId" TO "workspaceId";
ALTER TABLE public."workspace_file" RENAME COLUMN "groupId" TO "workspaceId";
ALTER TABLE public."file" RENAME COLUMN "owningGroupId" TO "owningWorkspaceId";

-----------------------------
--- INDEXES & CONSTRAINTS ---
-----------------------------

-- Renaming a table or column does not rename the objects named after it.

ALTER INDEX public."group_inviteSecret_idx" RENAME TO "workspace_inviteSecret_idx";
ALTER INDEX public."file_owning_group_id_idx" RENAME TO "file_owning_workspace_id_idx";
-- from 031_group_id_indexes.sql
ALTER INDEX public."group_user_group_id_idx" RENAME TO "workspace_user_workspace_id_idx";
ALTER INDEX public."group_file_group_id_idx" RENAME TO "workspace_file_workspace_id_idx";

ALTER TABLE public."workspace" RENAME CONSTRAINT "group_pkey" TO "workspace_pkey";
ALTER TABLE public."workspace_user" RENAME CONSTRAINT "group_user_pkey" TO "workspace_user_pkey";
ALTER TABLE public."workspace_user" RENAME CONSTRAINT "group_user_userId_fkey" TO "workspace_user_userId_fkey";
ALTER TABLE public."workspace_user" RENAME CONSTRAINT "group_user_groupId_fkey" TO "workspace_user_workspaceId_fkey";
-- re-created under this name by 033_rename_group_admin_role_to_member.sql
ALTER TABLE public."workspace_user" RENAME CONSTRAINT "group_user_role_check" TO "workspace_user_role_check";
ALTER TABLE public."workspace_file" RENAME CONSTRAINT "group_file_pkey" TO "workspace_file_pkey";
ALTER TABLE public."workspace_file" RENAME CONSTRAINT "group_file_fileId_fkey" TO "workspace_file_fileId_fkey";
ALTER TABLE public."workspace_file" RENAME CONSTRAINT "group_file_groupId_fkey" TO "workspace_file_workspaceId_fkey";
ALTER TABLE public."file" RENAME CONSTRAINT "file_owningGroupId_fkey" TO "file_owningWorkspaceId_fkey";

----------------
--- TRIGGERS ---
----------------

ALTER TRIGGER "update_group_user_details_trigger" ON public."user" RENAME TO "update_workspace_user_details_trigger";
ALTER TRIGGER "set_group_user_details_trigger" ON public."workspace_user" RENAME TO "set_workspace_user_details_trigger";
ALTER TRIGGER "update_file_group_details_trigger" ON public."workspace" RENAME TO "update_file_workspace_details_trigger";
ALTER TRIGGER "cleanup_deleted_group_trigger" ON public."workspace" RENAME TO "cleanup_deleted_workspace_trigger";
ALTER TRIGGER "cleanup_group_user_file_states_trigger" ON public."workspace_user" RENAME TO "cleanup_workspace_user_file_states_trigger";
ALTER TRIGGER "update_group_timestamp_trigger" ON public."workspace" RENAME TO "update_workspace_timestamp_trigger";
ALTER TRIGGER "update_group_user_timestamp_trigger" ON public."workspace_user" RENAME TO "update_workspace_user_timestamp_trigger";
ALTER TRIGGER "update_group_file_timestamp_trigger" ON public."workspace_file" RENAME TO "update_workspace_file_timestamp_trigger";
ALTER TRIGGER "update_home_group_name_trigger" ON public."user" RENAME TO "update_home_workspace_name_trigger";
ALTER TRIGGER "initialize_home_group_name_trigger" ON public."workspace" RENAME TO "initialize_home_workspace_name_trigger";
ALTER TRIGGER "validate_group_file_association_trigger" ON public."workspace_file" RENAME TO "validate_workspace_file_association_trigger";

-----------------
--- FUNCTIONS ---
-----------------

-- Rename first so the trigger bindings (which reference functions by OID)
-- follow, then re-create the bodies with the new table/column names. The
-- update_*_timestamp functions only touch NEW."updatedAt", so the rename alone
-- is enough for them.

ALTER FUNCTION update_group_user_details() RENAME TO update_workspace_user_details;
ALTER FUNCTION set_group_user_details() RENAME TO set_workspace_user_details;
ALTER FUNCTION update_file_group_details() RENAME TO update_file_workspace_details;
ALTER FUNCTION cleanup_deleted_group() RENAME TO cleanup_deleted_workspace;
ALTER FUNCTION cleanup_group_user_file_states() RENAME TO cleanup_workspace_user_file_states;
ALTER FUNCTION update_group_timestamp() RENAME TO update_workspace_timestamp;
ALTER FUNCTION update_group_user_timestamp() RENAME TO update_workspace_user_timestamp;
ALTER FUNCTION update_group_file_timestamp() RENAME TO update_workspace_file_timestamp;
ALTER FUNCTION update_home_group_name() RENAME TO update_home_workspace_name;
ALTER FUNCTION initialize_home_group_name() RENAME TO initialize_home_workspace_name;
ALTER FUNCTION validate_group_file_association() RENAME TO validate_workspace_file_association;

-- When the user's name or color is updated, update the userName and userColor
-- columns in the workspace_user table
CREATE OR REPLACE FUNCTION update_workspace_user_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "workspace_user"
  SET "userName" = NEW.name,
      "userColor" = COALESCE(NEW.color, '#000000')
  WHERE "userId" = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- When a workspace_user is inserted or updated, update the userName and
-- userColor columns
CREATE OR REPLACE FUNCTION set_workspace_user_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "workspace_user"
  SET "userName" = u."name",
      "userColor" = COALESCE(u."color", '#000000')
  FROM public."user" u
  WHERE u."id" = NEW."userId" AND "workspace_user"."userId" = NEW."userId" AND "workspace_user"."workspaceId" = NEW."workspaceId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update file owner details when the owning workspace's name changes, keeping
-- the denormalized ownerName field in sync
CREATE OR REPLACE FUNCTION update_file_workspace_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "file"
  SET "ownerName" = NEW.name,
      "ownerAvatar" = ''
  WHERE "owningWorkspaceId" = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Set file owner details when file ownership changes. Handles both user
-- ownership and workspace ownership.
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

  -- If the file is owned by a workspace, set workspace details
  IF NEW."owningWorkspaceId" IS NOT NULL THEN
    UPDATE "file"
    SET "ownerName" = w."name",
        "ownerAvatar" = ''
    FROM public."workspace" w
    WHERE w."id" = NEW."owningWorkspaceId" AND "file"."id" = NEW."id";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Clean up related records when a file is marked as deleted
CREATE OR REPLACE FUNCTION cleanup_deleted_file() RETURNS TRIGGER AS $$
BEGIN
  -- Delete any file states for this file
  DELETE FROM "file_state"
  WHERE "fileId" = NEW."id";

  -- Delete any workspace file associations for this file
  DELETE FROM "workspace_file"
  WHERE "fileId" = NEW."id";

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Clean up workspace associations when a workspace is marked as deleted
CREATE OR REPLACE FUNCTION cleanup_deleted_workspace() RETURNS TRIGGER AS $$
BEGIN
  -- Delete all workspace_user associations for this workspace
  DELETE FROM "workspace_user"
  WHERE "workspaceId" = NEW."id";

  -- Delete all workspace_file associations for this workspace
  DELETE FROM "workspace_file"
  WHERE "workspaceId" = NEW."id";

  -- Mark all files owned by this workspace as deleted
  UPDATE "file"
  SET "isDeleted" = true
  WHERE "owningWorkspaceId" = NEW."id";

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Clean up file states when a user leaves a workspace. This removes access to
-- non-shared files that are owned by the workspace the user just left.
CREATE OR REPLACE FUNCTION cleanup_workspace_user_file_states() RETURNS TRIGGER AS $$
BEGIN
  -- Delete file_state records for files that are:
  -- 1. Owned by the workspace the user just left (OLD.workspaceId)
  -- 2. Not shared (so the user no longer has access)
  DELETE FROM "file_state"
  WHERE "userId" = OLD."userId"
    AND "fileId" IN (
      SELECT "id" FROM "file"
      WHERE "owningWorkspaceId" = OLD."workspaceId"
        AND "shared" = false
    );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Sync home workspace name with user name on update
CREATE OR REPLACE FUNCTION update_home_workspace_name() RETURNS TRIGGER AS $$
BEGIN
  -- Update the workspace name where the workspace id matches the user id (home workspace)
  UPDATE "workspace"
  SET "name" = NEW.name
  WHERE "id" = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Initialize a home workspace's name from the user's name on creation
CREATE OR REPLACE FUNCTION initialize_home_workspace_name() RETURNS TRIGGER AS $$
BEGIN
  -- If there's a user with the same id as the workspace, update the workspace name to match
  UPDATE "workspace"
  SET "name" = u."name"
  FROM public."user" u
  WHERE u."id" = NEW."id" AND "workspace"."id" = NEW."id";

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validate workspace_file associations: the file must be shared or owned by the
-- workspace, preventing links to private files the workspace doesn't own
CREATE OR REPLACE FUNCTION validate_workspace_file_association() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "file" f
    WHERE f."id" = NEW."fileId"
      AND (f."shared" = true OR f."owningWorkspaceId" = NEW."workspaceId")
  ) THEN
    RAISE EXCEPTION 'Cannot link file to workspace: file must be shared or owned by the workspace';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Clean up guest access when a file is unshared (shared: true -> false), for
-- both ownership models (see 034_fix_unshare_group_file_cleanup.sql):
--   * file_state: delete states for anyone who isn't the legacy owner
--     (NULL-safe) or a current member of the owning workspace;
--   * workspace_file: delete the file's links except the owning workspace's own
--     row and home-workspace links of users who keep access (the legacy owner /
--     owning-workspace members).
CREATE OR REPLACE FUNCTION delete_file_states() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.shared = TRUE AND NEW.shared = FALSE THEN
    DELETE FROM file_state fs
    WHERE fs."fileId" = OLD.id
      -- not the legacy owner (IS DISTINCT FROM is NULL-safe, so a NULL ownerId
      -- never accidentally protects a guest the way `!=` did)
      AND OLD."ownerId" IS DISTINCT FROM fs."userId"
      -- not a current member of the owning workspace (no-op for legacy files,
      -- where owningWorkspaceId is NULL and the subquery returns nothing)
      AND NOT EXISTS (
        SELECT 1 FROM workspace_user wu
        WHERE wu."workspaceId" = OLD."owningWorkspaceId"
          AND wu."userId" = fs."userId"
      );

    DELETE FROM workspace_file wf
    WHERE wf."fileId" = OLD.id
      -- never the owning workspace's own row: that's where the file lives
      AND wf."workspaceId" IS DISTINCT FROM OLD."owningWorkspaceId"
      -- not the legacy owner's home-workspace link (home workspace id == user id)
      AND wf."workspaceId" IS DISTINCT FROM OLD."ownerId"
      -- not a home-workspace link of a current owning-workspace member (no-op
      -- for legacy files, where owningWorkspaceId is NULL and the subquery
      -- returns nothing)
      AND NOT EXISTS (
        SELECT 1 FROM workspace_user wu
        WHERE wu."workspaceId" = OLD."owningWorkspaceId"
          AND wu."userId" = wf."workspaceId"
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Migration function to move a user from the legacy file_state-based model to
-- the workspace_file-based model. Renamed from migrate_user_to_groups; the
-- 'groups_backend' flag value is unchanged because it's persisted in user rows.
-- Usage: SELECT migrate_user_to_workspaces('user-id-here', 'invite-secret');
ALTER FUNCTION migrate_user_to_groups(TEXT, TEXT) RENAME TO migrate_user_to_workspaces;

CREATE OR REPLACE FUNCTION migrate_user_to_workspaces(target_user_id TEXT, invite_secret TEXT)
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

    -- Check if user already has the migrated flag
    SELECT flags INTO v_current_flags FROM public."user" WHERE id = target_user_id;
    IF v_current_flags LIKE '%groups_backend%' THEN
      RAISE NOTICE 'User % already has the migrated flag, skipping migration', target_user_id;
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

    -- Create a home workspace for the user
    INSERT INTO public."workspace" ("id", "name", "createdAt", "updatedAt", "isDeleted", "inviteSecret")
    VALUES (target_user_id, target_user_id, v_now, v_now, FALSE, invite_secret)
    ON CONFLICT DO NOTHING;

    -- Make the user a member of the home workspace
    INSERT INTO public."workspace_user" ("userId", "workspaceId", "createdAt", "updatedAt", "role", "index", "userName", "userColor")
    VALUES (target_user_id, target_user_id, v_now, v_now, 'owner', 'a1', '', '')
    ON CONFLICT DO NOTHING;

    -- For any files owned by the user, change the owningWorkspaceId to the home workspace and set the ownerId to null
    UPDATE public."file"
    SET "owningWorkspaceId" = target_user_id,
        "ownerId" = NULL
    WHERE "ownerId" = target_user_id;

    -- For any files that the user has access to, create a workspace_file entry in the home workspace
    INSERT INTO public."workspace_file" ("fileId", "workspaceId", "createdAt", "updatedAt")
    SELECT fs."fileId", target_user_id, COALESCE(fs."firstVisitAt", f."createdAt", v_now), COALESCE(fs."lastEditAt", fs."firstVisitAt", f."updatedAt", f."createdAt", v_now)
    FROM public."file_state" fs JOIN public."file" f ON fs."fileId" = f."id"
    WHERE fs."userId" = target_user_id
    ON CONFLICT DO NOTHING;

    -- Update indexes for the workspace_file entries
    UPDATE public."workspace_file" wf
    SET "index" = 'a' || fs.i::text
    FROM (
      SELECT "fileId", ROW_NUMBER() over (ORDER BY COALESCE("lastEditAt", "firstVisitAt", 0) DESC) AS i
      FROM public."file_state"
      WHERE "userId" = target_user_id
        AND "isPinned" = TRUE
    ) AS fs
    WHERE wf."fileId" = fs."fileId" AND wf."workspaceId" = target_user_id;

    -- Add the 'groups_backend' flag to the user (historical flag value, see above)
    IF v_current_flags IS NULL OR v_current_flags = '' THEN
        UPDATE public."user" SET flags = 'groups_backend' WHERE id = target_user_id;
    ELSE
        UPDATE public."user" SET flags = v_current_flags || ' groups_backend' WHERE id = target_user_id;
    END IF;

    RAISE NOTICE 'Successfully migrated user % to the workspaces model. Files: %, Pinned: %',
                 target_user_id, v_files_migrated, v_pinned_files_migrated;

    RETURN QUERY SELECT v_files_migrated, v_pinned_files_migrated, TRUE;
END;
$$ LANGUAGE plpgsql;

-- Compatibility wrapper: the sync-worker deployment that is live while this
-- migration runs still calls migrate_user_to_groups (the new worker deploys a
-- few minutes later). Safe to drop in a future migration.
CREATE OR REPLACE FUNCTION migrate_user_to_groups(target_user_id TEXT, invite_secret TEXT)
RETURNS TABLE (
    files_migrated INTEGER,
    pinned_files_migrated INTEGER,
    flag_added BOOLEAN
) AS $$
BEGIN
    RETURN QUERY SELECT * FROM migrate_user_to_workspaces(target_user_id, invite_secret);
END;
$$ LANGUAGE plpgsql;
