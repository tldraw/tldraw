ALTER TABLE public."user"
ADD COLUMN "isTextOutlineEnabled" BOOLEAN DEFAULT NULL;

ALTER TABLE public."user"
ADD CONSTRAINT "isTextOutlineEnabled_check" CHECK ("isTextOutlineEnabled" IS NULL OR "isTextOutlineEnabled" IN (TRUE, FALSE));
