-- Nullable with no default: Zero backfills columns added with a default, and clients that query
-- the column before the backfill finishes break (see 037). Null reads as 'shared'.
ALTER TABLE public."group"
ADD COLUMN "defaultFileSharing" TEXT DEFAULT NULL;

ALTER TABLE public."group"
ADD CONSTRAINT "defaultFileSharing_check" CHECK ("defaultFileSharing" IS NULL OR "defaultFileSharing" IN ('shared', 'private'));
