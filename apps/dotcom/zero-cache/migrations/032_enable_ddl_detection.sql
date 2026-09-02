-- Enable Zero's manual DDL detection so it trusts the migration runner's
-- update_schemas() calls instead of event triggers (Supabase doesn't fire them
-- for ALTER PUBLICATION). Guarded because zero_0 doesn't exist until Zero boots,
-- which happens after migrations on a fresh database.
-- https://zero.rocicorp.dev/docs/connecting-to-postgres#schema-change-hooks
DO $$
BEGIN
  IF to_regclass('zero_0."shardConfig"') IS NOT NULL THEN
    UPDATE zero_0."shardConfig" SET "ddlDetection" = true;
  END IF;
END $$;
