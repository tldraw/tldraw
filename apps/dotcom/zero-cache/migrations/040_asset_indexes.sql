-- The asset table only has a primary key on "objectName". Both foreign keys are
-- unindexed, so every lookup by file ("fileId" = ?) or user ("userId" = ?) is a
-- sequential scan over the whole table (one row per upload, millions of rows), as
-- are the per-row FK checks when cascading file deletes and user deletes.
-- IF NOT EXISTS so an operator can pre-build these with CREATE INDEX CONCURRENTLY
-- (not possible here: migrations run inside a transaction) and this becomes a no-op.
CREATE INDEX IF NOT EXISTS "asset_file_id_idx" ON "asset" ("fileId");
CREATE INDEX IF NOT EXISTS "asset_user_id_idx" ON "asset" ("userId");
