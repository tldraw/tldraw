CREATE TABLE "group" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL 
);
CREATE TABLE "user_group" (
  "userId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  "role" TEXT NOT NULL,
  PRIMARY KEY ("userId", "groupId"),
  FOREIGN KEY ("userId") REFERENCES public."user" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("groupId") REFERENCES public."group" ("id") ON DELETE CASCADE
);

CREATE TABLE "user_presence" (
  "sessionId" TEXT NOT NULL PRIMARY KEY,
  "fileId" TEXT NOT NULL,
  -- These are not necessarily unique, as a user can have multiple tabs open.
  -- These are also not necessarily users in our DB since we support guests, who
  -- get a random ID assigned by the client.
  "userId" TEXT NOT NULL,
  "lastActivityAt" BIGINT NOT NULL,
  -- We let the client decide the name and color of the user, so we can support
  -- guests more easily.
  "name" TEXT,
  "color" TEXT,
  FOREIGN KEY ("fileId") REFERENCES public."file" ("id") ON DELETE CASCADE
);
ALTER PUBLICATION zero_data ADD TABLE public."group", public."user_group", public."user_presence";

-- add 'groupId' to file table and a foreign key to group table
ALTER TABLE "file"
ADD COLUMN "groupId" TEXT;
ALTER TABLE "file"
ADD FOREIGN KEY ("groupId") REFERENCES public."group" ("id") ON DELETE CASCADE;