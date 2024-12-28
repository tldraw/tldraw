-- Purpose: Make the publishedSlug column unique in the file table.

ALTER TABLE public.file
ADD CONSTRAINT unique_publishedSlug UNIQUE ("publishedSlug");
