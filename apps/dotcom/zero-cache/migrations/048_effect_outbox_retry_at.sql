-- Timed retry backoff for effect_outbox. A failed row schedules its next
-- eligible retry so rapid pokes can't burn all attempts in a burst; the drain
-- filter skips rows until "nextRetryAt" passes and the 30s alarm sweep retries.
ALTER TABLE public.effect_outbox ADD COLUMN "nextRetryAt" TIMESTAMPTZ;
