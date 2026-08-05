-- Stamp comment."createdAt" on the server instead of trusting the authoring client's clock.
-- Client stamps made the notifications reply gate compare timestamps from different machines:
-- a user who replied to a thread within the gate's clock-skew tolerance got notified about the
-- very comment they were replying to. With a single server clock the gate can compare strictly
-- and drop the tolerance.
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
