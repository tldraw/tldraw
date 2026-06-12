ALTER TABLE public."user"
ADD COLUMN "rememberLastUsedStyles" BOOLEAN DEFAULT NULL;

ALTER TABLE public."user"
ADD CONSTRAINT "rememberLastUsedStyles_check" CHECK ("rememberLastUsedStyles" IS NULL OR "rememberLastUsedStyles" IN (TRUE, FALSE));

ALTER TABLE public."user"
ADD COLUMN "lastUsedStyles" TEXT DEFAULT NULL;
