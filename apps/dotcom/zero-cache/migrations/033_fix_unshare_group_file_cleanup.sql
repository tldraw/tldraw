-- Fix guest file_state cleanup when a group-owned file is unshared.
--
-- The original delete_file_states trigger (000_seed.sql) keys on
-- `OLD."ownerId" != "userId"` to decide which file_states are "guests". The groups
-- backend (023_groups.sql) introduced group-owned files where `ownerId` is NULL
-- (see the ownerId XOR owningGroupId constraint). For those files
-- `NULL != "userId"` evaluates to NULL, so the DELETE matched no rows and guest
-- file_states lingered after unsharing — leaving the now-private file syncing to
-- ex-guests and showing in their recent files.
--
-- This replaces the function so it works for both ownership models:
--   * legacy files: delete states for anyone who isn't the owner (NULL-safe), and
--   * group-owned files: delete states for anyone who isn't a current member of the
--     owning group.
-- The trigger binding (file_shared_update) is unchanged.
CREATE OR REPLACE FUNCTION delete_file_states() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.shared = TRUE AND NEW.shared = FALSE THEN
    DELETE FROM file_state fs
    WHERE fs."fileId" = OLD.id
      -- not the legacy owner (IS DISTINCT FROM is NULL-safe, so a NULL ownerId
      -- never accidentally protects a guest the way `!=` did)
      AND OLD."ownerId" IS DISTINCT FROM fs."userId"
      -- not a current member of the owning group (no-op for legacy files, where
      -- owningGroupId is NULL and the subquery returns nothing)
      AND NOT EXISTS (
        SELECT 1 FROM group_user gu
        WHERE gu."groupId" = OLD."owningGroupId"
          AND gu."userId" = fs."userId"
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
