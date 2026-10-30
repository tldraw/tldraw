-- No DEFAULT: a default on ADD COLUMN makes Zero backfill the whole user table.
ALTER TABLE public."user" ADD COLUMN "whatsNewSeenAt" BIGINT;
ALTER TABLE public."user" ADD COLUMN "whatsNewAutoOpen" BOOLEAN;
