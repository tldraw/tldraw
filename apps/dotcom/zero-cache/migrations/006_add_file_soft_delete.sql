-- Purpose: Add a column to the file table that indicates whether the file has been soft deleted.

ALTER TABLE public.file
ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE;
