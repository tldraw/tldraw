CREATE TABLE "user" (
  "id" VARCHAR PRIMARY KEY,
  "name" VARCHAR NOT NULL,
  "email" VARCHAR NOT NULL,
  "avatar" VARCHAR NOT NULL,
  "color" VARCHAR NOT NULL,
  "exportFormat" VARCHAR NOT NULL,
  "exportTheme" VARCHAR NOT NULL,
  "exportBackground" BOOLEAN NOT NULL,
  "exportPadding" BOOLEAN NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  "flags" VARCHAR NOT NULL,
  "locale" VARCHAR,
  "animationSpeed" BIGINT,
  "edgeScrollSpeed" BIGINT,
  "colorScheme" VARCHAR,
  "isSnapMode" BOOLEAN,
  "isWrapMode" BOOLEAN,
  "isDynamicSizeMode" BOOLEAN,
  "isPasteAtCursorMode" BOOLEAN
);

CREATE TABLE "file" (
  "id" VARCHAR PRIMARY KEY,
  "name" VARCHAR NOT NULL,
  "ownerId" VARCHAR NOT NULL,
  "thumbnail" VARCHAR NOT NULL,
  "shared" BOOLEAN NOT NULL,
  "sharedLinkType" VARCHAR NOT NULL,
  "published" BOOLEAN NOT NULL,
  "lastPublished" BIGINT NOT NULL,
  "publishedSlug" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  "isEmpty" BOOLEAN NOT NULL,
  FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE "file_state" (
  "userId" VARCHAR NOT NULL,
  "fileId" VARCHAR NOT NULL,
  "firstVisitAt" BIGINT,
  "lastEditAt" BIGINT,
  "lastSessionState" VARCHAR,
  "lastVisitAt" BIGINT,
  PRIMARY KEY ("userId", "fileId"),
  FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("fileId") REFERENCES "file" ("id") ON DELETE CASCADE
);

CREATE TABLE "user_mutation_number" (
	"userId" VARCHAR NOT NULL PRIMARY KEY,
	"mutationNumber" BIGINT NOT NULL
);

CREATE PUBLICATION alltables FOR ALL TABLES;

CREATE OR REPLACE FUNCTION delete_file_states() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.shared = TRUE AND NEW.shared = FALSE  THEN
    DELETE FROM file_state WHERE "fileId" = OLD.id AND OLD."ownerId" != "userId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create the trigger
CREATE TRIGGER file_shared_update
AFTER UPDATE OF shared ON file
FOR EACH ROW
EXECUTE FUNCTION delete_file_states();