ALTER TABLE public."user"
ADD COLUMN "isZoomDirectionInverted" BOOLEAN DEFAULT NULL;

ALTER TABLE public."user"
ADD CONSTRAINT "isZoomDirectionInverted_check" CHECK ("isZoomDirectionInverted" IS NULL OR "isZoomDirectionInverted" IN (TRUE, FALSE));
