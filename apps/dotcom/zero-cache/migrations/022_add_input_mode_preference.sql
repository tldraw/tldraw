ALTER TABLE public."user"
ADD COLUMN "inputMode" VARCHAR DEFAULT NULL;

ALTER TABLE public."user"
ADD CONSTRAINT "inputMode_check" CHECK ("inputMode" IS NULL OR "inputMode" IN ('trackpad', 'mouse'));