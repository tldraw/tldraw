ALTER TABLE public."group"
ADD COLUMN "defaultFileSharing" TEXT NOT NULL DEFAULT 'shared'
CONSTRAINT "defaultFileSharing_check" CHECK ("defaultFileSharing" IN ('shared', 'private'));
