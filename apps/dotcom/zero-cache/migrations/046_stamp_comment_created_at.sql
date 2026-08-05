-- Stamp comment."createdAt" on the server. The notifications reply gate compares comment times
-- against the user's join time with a strict ">", which is only sound when every comment in a
-- thread is stamped by one clock — client clocks would make thread history and genuine replies
-- indistinguishable.
--
-- The stamp is monotonic per thread, not plain now(): the room's Durable Object drains several
-- comments in one transaction (where now() is frozen) and even clock_timestamp() can tie at the
-- column's millisecond resolution. Ties break the strict "after my join" compare, so each insert
-- takes at least predecessor + 1ms. Rows never insert concurrently for one thread — a thread
-- belongs to one file and one file is one Durable Object — so the SELECT MAX has no race.
--
-- BEFORE INSERT only: the drain retries at-least-once via ON CONFLICT, whose update set does not
-- include "createdAt", so the first successful insert's stamp is permanent.
CREATE OR REPLACE FUNCTION set_comment_created_at() RETURNS TRIGGER AS $$
BEGIN
  NEW."createdAt" := GREATEST(
    (SELECT COALESCE(MAX("createdAt"), 0) + 1 FROM comment WHERE "threadId" = NEW."threadId"),
    (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT
  );
  -- keep the derived sort key consistent with the re-stamped creation time
  NEW."updatedAt" := GREATEST(NEW."updatedAt", NEW."createdAt");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "set_comment_created_at_trigger"
BEFORE INSERT ON comment
FOR EACH ROW
EXECUTE FUNCTION set_comment_created_at();

-- Clamp pre-existing rows whose client stamp sits in the future (a wrong system clock). Left
-- alone, such a row would poison its thread: every new insert chains to future+n via the
-- GREATEST above, and future stamps pin the top of the createdAt-DESC bounded notifications
-- window. Order among clamped rows is preserved by fanning them out just below the migration
-- time; past-dated rows keep their stamps — rewriting history would change displayed times.
WITH now_ms AS (
  SELECT (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT AS ms
),
clamped AS (
  SELECT
    "id",
    (SELECT ms FROM now_ms)
      - COUNT(*) OVER (PARTITION BY "threadId")
      + ROW_NUMBER() OVER (PARTITION BY "threadId" ORDER BY "createdAt", "id") AS stamp
  FROM comment
  WHERE "createdAt" > (SELECT ms FROM now_ms)
)
UPDATE comment c
SET "createdAt" = clamped.stamp, "updatedAt" = clamped.stamp
FROM clamped
WHERE c."id" = clamped."id";
