-- Clean up orphan "link" group_file rows left by the removed drag-to-link feature.
--
-- #9107 shipped handleFileDragOperation with a "file link" concept: dragging a
-- SHARED file you don't own onto a workspace inserted a group_file row into that
-- workspace WITHOUT changing the file's owningGroupId (a "link", not a move). The
-- validate_group_file_association trigger allowed it because the file is shared.
-- #9254 removed that feature and moved to a single-ownership model, but never
-- cleaned up the rows it had already written.
--
-- In the current model a non-home workspace lists a file only when it OWNS it
-- (getWorkspaceFilesSorted: owningGroupId === workspaceId). So each leftover link
-- row is invisible AND — worse — onEnterFile's old guard treated "a group_file row
-- exists in one of my groups" as "the file is already visible to me", so it skipped
-- creating the home guest-link. A member of the workspace the file was linked into
-- therefore saw the file NOWHERE. (The onEnterFile guard is fixed separately to key
-- off ownership; this migration removes the bad data.)
--
-- An orphan link row is a group_file row whose group neither owns the file nor is a
-- user's home group (home group id === user id). We must NOT touch:
--   * the owning row (groupId === owningGroupId), or
--   * home guest rows (groupId is some user's id).

-- 1) Re-link affected files into the home of users who could reach them ONLY through
--    an orphan row: members of the orphan's workspace who visited the file as a guest
--    and have no home link yet. Mirrors the fixed onEnterFile so the file reappears in
--    their sidebar without needing to re-open it. Runs before the delete so the orphan
--    rows are still present to derive the affected set. Idempotent via ON CONFLICT.
INSERT INTO public."group_file" ("fileId", "groupId", "createdAt", "updatedAt", "index")
SELECT DISTINCT
  fs."fileId",
  fs."userId",
  (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
  (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
  NULL
FROM public."group_file" orphan
JOIN public."file" f ON f."id" = orphan."fileId"
JOIN public."group_user" gu ON gu."groupId" = orphan."groupId"
JOIN public."file_state" fs ON fs."fileId" = orphan."fileId" AND fs."userId" = gu."userId"
WHERE
  -- orphan condition: the row's group does not own the file...
  orphan."groupId" IS DISTINCT FROM f."owningGroupId"
  -- ...and is not a user's home group
  AND NOT EXISTS (SELECT 1 FROM public."user" ou WHERE ou."id" = orphan."groupId")
  -- only surface files the user can actually still access
  AND f."shared" = true
  AND f."isDeleted" = false
  AND fs."isFileOwner" = false
  -- skip users who own the file via a workspace they belong to (already visible there)
  AND NOT EXISTS (
    SELECT 1 FROM public."group_user" owns
    WHERE owns."userId" = fs."userId" AND owns."groupId" = f."owningGroupId"
  )
  -- skip users who already have a home link for this file
  AND NOT EXISTS (
    SELECT 1 FROM public."group_file" home
    WHERE home."fileId" = fs."fileId" AND home."groupId" = fs."userId"
  )
ON CONFLICT ("fileId", "groupId") DO NOTHING;

-- 2) Delete the orphan link rows.
DELETE FROM public."group_file" gf
USING public."file" f
WHERE gf."fileId" = f."id"
  AND gf."groupId" IS DISTINCT FROM f."owningGroupId"
  AND NOT EXISTS (SELECT 1 FROM public."user" u WHERE u."id" = gf."groupId");
