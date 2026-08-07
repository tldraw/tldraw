-- Points at the file whose published snapshot seeds a new workspace's first file (the
-- "welcome template"). Set by an admin action; read by the sync worker when it materializes
-- a file created with createSource 'welcome'. When no row is present (fresh env, before an
-- admin has marked one) the worker falls back to a committed default snapshot.
--
-- Singleton: the boolean primary key only permits id = TRUE, so there is at most one row.
-- Deliberately NOT added to the Zero publication — this is worker-side config, not client
-- sync state, so the client never replicates it.
CREATE TABLE welcome_template (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  "fileId" VARCHAR NOT NULL,
  "publishedSlug" VARCHAR NOT NULL,
  "updatedAt" BIGINT NOT NULL
);
