-- Fix guest cleanup when a group-owned file is unshared.
--
-- The original delete_file_states trigger (000_seed.sql) keys on
-- `OLD."ownerId" != "userId"` to decide which file_states are "guests". The groups
-- backend (023_groups.sql) introduced group-owned files where `ownerId` is NULL
-- (see the ownerId XOR owningGroupId constraint). For those files
-- `NULL != "userId"` evaluates to NULL, so the DELETE matched no rows and guest
-- file_states lingered after unsharing — leaving the now-private file syncing to
-- ex-guests and showing in their recent files.
--
-- Visiting a shared file also links it into the visitor's home group via a
-- group_file row (home group id == user id by convention), which is what puts
-- the file in their recent files. Nothing cleaned those links up on unshare
-- either — so the file's name kept showing in an ex-guest's recent files even
-- once their file_state and access were gone.
--
-- This replaces the function so it cleans up both records for both ownership
-- models:
--   * file_state: delete states for anyone who isn't the legacy owner
--     (NULL-safe) or a current member of the owning group;
--   * group_file: delete the file's links except the owning group's own row
--     and home-group links of users who keep access (the legacy owner /
--     owning-group members).
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

    DELETE FROM group_file gf
    WHERE gf."fileId" = OLD.id
      -- never the owning group's own row: that's where the file lives
      AND gf."groupId" IS DISTINCT FROM OLD."owningGroupId"
      -- not the legacy owner's home-group link (home group id == user id)
      AND gf."groupId" IS DISTINCT FROM OLD."ownerId"
      -- not a home-group link of a current owning-group member (no-op for
      -- legacy files, where owningGroupId is NULL and the subquery returns
      -- nothing)
      AND NOT EXISTS (
        SELECT 1 FROM group_user gu
        WHERE gu."groupId" = OLD."owningGroupId"
          AND gu."userId" = gf."groupId"
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
