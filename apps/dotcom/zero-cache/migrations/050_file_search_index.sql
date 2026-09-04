-- no-transaction
-- Serves `search_boards` (searchBoards.ts): its access filter is `"owningGroupId" IN (:groups)`
-- and it orders by "createdAt" desc, so with both in one index a page is read in index order and
-- stops, instead of top-N sorting the caller's whole in-scope set. Only usable now that the
-- predicate is a single equality — the `"ownerId" = :caller` arm it used to carry made the planner
-- answer with a BitmapOr, whose output has no order.
--
-- The `file.id` tiebreak in that ORDER BY is deliberately left out: the primary key already makes
-- id unique, and ties on "createdAt" are rare enough that sorting within one is not worth a wider
-- index.
--
-- Built CONCURRENTLY: a plain CREATE INDEX holds a SHARE lock on "file" for the whole build,
-- blocking every board create, rename and delete until it finishes. The DROP is not redundant — a
-- CREATE INDEX CONCURRENTLY that fails part-way leaves an INVALID index behind, and IF NOT EXISTS
-- would then match it and do nothing, leaving an index the planner never uses. The ledger means
-- this file only re-runs after a failure, so the DROP is a no-op on a clean first run and clears
-- the wreckage on a retry. DROP INDEX CONCURRENTLY rather than plain DROP because plain DROP takes
-- an ACCESS EXCLUSIVE lock on the table, the exact thing this migration avoids.

DROP INDEX CONCURRENTLY IF EXISTS "file_owning_group_created_at_idx";
CREATE INDEX CONCURRENTLY IF NOT EXISTS "file_owning_group_created_at_idx"
  ON public."file" ("owningGroupId", "createdAt" DESC);
