CREATE TABLE "group" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE TABLE "user_group" (
  "userId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "role" TEXT NOT NULL,
  PRIMARY KEY ("userId", "groupId"),
  FOREIGN KEY ("userId") REFERENCES public."user" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("groupId") REFERENCES public."group" ("id") ON DELETE CASCADE
);
CREATE TABLE "user_presence" (
  "userId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "lastActivityAt" TIMESTAMP DEFAULT NOW(),
  "name" TEXT,
  "avatar" TEXT,
  PRIMARY KEY ("userId", "fileId"),
  FOREIGN KEY ("userId") REFERENCES public."user" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("fileId") REFERENCES public."file" ("id") ON DELETE CASCADE
);
ALTER PUBLICATION zero_data ADD TABLE public."group", public."user_group", public."user_presence";

-- add 'groupId' to file table and a foreign key to group table
ALTER TABLE "file"
ADD COLUMN "groupId" TEXT;
ALTER TABLE "file"
ADD FOREIGN KEY ("groupId") REFERENCES public."group" ("id") ON DELETE CASCADE;

-- When the user's name or avatar is updated, update the ownerName and ownerAvatar columns in the file table

CREATE OR REPLACE FUNCTION update_presence_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "user_presence"
  SET "name" = NEW.name,
      "avatar" = NEW.avatar
  WHERE "userId" = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- When a file is inserted or updated, update the ownerName and ownerAvatar columns in the file table

CREATE OR REPLACE FUNCTION set_presence_details() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "user_presence"
  SET NEW."name" = u."name",
      NEW."avatar" = u."avatar"
  FROM public."user" u
  WHERE u."id" = NEW."userId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- When the user's name or avatar is updated, update the ownerName and ownerAvatar columns in the file table

CREATE TRIGGER "update_presence_details_trigger"
AFTER UPDATE OF "name", "avatar" ON public."user"
FOR EACH ROW
WHEN (OLD."name" IS DISTINCT FROM NEW."name" OR OLD."avatar" IS DISTINCT FROM NEW."avatar")
EXECUTE FUNCTION update_presence_details();

-- When a file is inserted or updated, update the ownerName and ownerAvatar columns in the file table

CREATE TRIGGER "set_presence_details_trigger"
AFTER INSERT ON "user_presence"
FOR EACH ROW
EXECUTE FUNCTION set_presence_details();