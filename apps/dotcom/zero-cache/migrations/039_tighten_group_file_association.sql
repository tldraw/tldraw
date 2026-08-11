-- Tighten validate_group_file_association to match the single-ownership model.
--
-- The original trigger (023_groups.sql) allowed a group_file row whenever the file
-- was shared OR owned by the group. That "shared" allowance is what let the removed
-- drag-to-link feature (#9107, removed in #9254) link a shared file into ANY
-- workspace without changing owningGroupId — the orphan rows cleaned up in migration
-- 038. Now that only two kinds of group_file rows are legitimate, tighten the check
-- so the database rejects a re-appearance of those cross-workspace links:
--
--   1. The owning row: group_file.groupId === file.owningGroupId.
--   2. A home guest link: group_file.groupId is a user's home group (a user exists
--      with that id) and the file is shared, i.e. the guest can actually access it.
--
-- A shared file can no longer be linked into a non-home workspace that doesn't own
-- it. All current insert paths (createFile, onEnterFile home link, moveFileToWorkspace)
-- satisfy one of the two allowed cases.
CREATE OR REPLACE FUNCTION validate_group_file_association() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "file" f
    WHERE f."id" = NEW."fileId"
      AND (
        -- the group owns the file
        f."owningGroupId" = NEW."groupId"
        -- ...or it's a home guest link for a shared file
        OR (
          f."shared" = true
          AND EXISTS (SELECT 1 FROM "user" u WHERE u."id" = NEW."groupId")
        )
      )
  ) THEN
    RAISE EXCEPTION 'Cannot link file to group: group must own the file, or the file must be shared and linked into a user home group';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
