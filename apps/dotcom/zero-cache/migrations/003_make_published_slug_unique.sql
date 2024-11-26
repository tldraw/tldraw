ALTER TABLE public.file
ADD CONSTRAINT unique_publishedSlug UNIQUE ("publishedSlug");
