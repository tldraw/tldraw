-- Stamp comment."createdAt" on the server: the notifications reply gate compares comment times
-- with a strict ">", which needs one clock and one total order per thread. Monotonic (max + 1)
-- rather than plain time because the Durable Object drains several comments in one transaction,
-- where now() is frozen and clock_timestamp() ties at millisecond resolution. No race on the
-- SELECT MAX: a thread belongs to one file, and one file is one Durable Object.
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
