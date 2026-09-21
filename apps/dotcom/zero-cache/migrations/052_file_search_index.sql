-- Serves `search_boards` (searchBoards.ts): each arm of its per-workspace merge filters on
-- `"owningGroupId" = :group` and orders by "createdAt" desc, so with both in one index a page is
-- read in index order and stops, instead of top-N sorting the caller's whole in-scope set. Only
-- usable now that the access predicate is a single equality — the `"ownerId" = :caller` arm it used
-- to carry made the planner answer with a BitmapOr, whose output has no order.
--
-- The `file.id` tiebreak in that ORDER BY is deliberately left out: the primary key already makes
-- id unique, and ties on "createdAt" are rare enough that sorting within one is not worth a wider
-- index.
--
-- Built plainly rather than CONCURRENTLY, which would need the runner to leave its transaction. A
-- plain build takes SHARE on "file", so reads continue but every write blocks — board create,
-- rename, delete, and the "updatedAt" bump `005_update_file_trigger.sql` fires on any row change.
-- Measured at production's shape (968k rows, 406MB heap, Postgres 16) that window is 1-2 seconds.
--
-- The runner holds one transaction over every migration in a run, so the SHARE lock is taken here
-- and released at the run's COMMIT, not when the build ends: everything queued after this file
-- extends the window in which writes to "file" block.
--
-- Keep it the only index build in its run, and specifically do not add one on "group_file" here.
-- This transaction would then hold "file" while waiting for "group_file", and `moveFileToWorkspace`
-- takes those two in the opposite order — reproduced on PG16, and the migration is the one Postgres
-- kills, so the deploy fails. A run that locks one of the two cannot be in that cycle at all.

CREATE INDEX "file_owning_group_created_at_idx"
  ON public."file" ("owningGroupId", "createdAt" DESC);
