-- Purpose: Add a fairies column to the user table to store per-user fairy configurations (outfit, personality, wand).

ALTER TABLE "user"
ADD COLUMN "fairies" VARCHAR;

