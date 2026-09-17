-- Serves the link-shared half of `search_boards` (searchBoards.ts). That read filters
-- `group_file."groupId" = :callersHomeGroup` and orders by `group_file."createdAt"` desc, so with
-- both in one index it reads a page and stops. Without it the read has no ordered access path at
-- all — the access key would be on `group_file` and the sort key on `file`, and no index spans two
-- tables — so it fetched every guest link the caller had and sorted them: 938 buffers for the
-- heaviest account in production, and a hash join over the whole `file` table past ~2,000 links.
--
-- `"createdAt"` is when the board entered that list, not when it was made: `createFile` and
-- `moveFileToWorkspace` both stamp it alongside the row they create, and opening a link-shared
-- board stamps it with the moment of opening. That is what makes it the right sort key here and
-- safe as a keyset one — `update_group_file_timestamp` only ever writes `updatedAt`, the mutators
-- only ever update `index`, so nothing rewrites it after insert.
--
-- Built plainly rather than CONCURRENTLY, for the reasons on `052_file_search_index.sql`: it takes
-- SHARE on "group_file", so reads continue and writes block for the length of the build.
--
-- This has to be the only index build in its migration run, and that is why it ships in its own
-- deploy rather than alongside `052`. The runner holds one transaction over every pending migration,
-- so a run building both would hold "file" through 052 and then ask for "group_file" — while
-- `moveFileToWorkspace` takes those two in the opposite order (`group_file` delete, then the `file`
-- update). Reproduced on PG16: 40P01, with the migration as the victim, so the deploy fails.
--
-- No lock ordering fixes that, because the app contradicts itself: `createFile` takes "file" then
-- "group_file". Taking both up front in a LOCK TABLE only narrows the window and moves the victim
-- onto a user's file move, which is worse than a failed deploy. A run that locks one of the two
-- cannot be in the cycle at all, which is what a separate deploy buys — verified against both
-- mutators. So: do not add another table's index to this run.

CREATE INDEX "group_file_group_created_at_idx"
  ON public."group_file" ("groupId", "createdAt" DESC);
