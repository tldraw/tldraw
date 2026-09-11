-- Last failure message for an effect_outbox row, overwritten on every failed attempt.
-- The drain only reports the first and parking attempts to Sentry, so without this a
-- parked row shows "attempts 10" and nothing else; the row carries its own diagnosis.
ALTER TABLE public.effect_outbox ADD COLUMN "lastError" TEXT;
