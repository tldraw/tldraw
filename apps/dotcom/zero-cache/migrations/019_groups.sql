CREATE TABLE "group" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "inviteSecret" TEXT,
  "createdAt" BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  "updatedAt" BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE INDEX "group_inviteSecret_idx" ON "group" ("inviteSecret");

CREATE TABLE "group_user" (
  "userId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "createdAt" BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  "updatedAt" BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  "role" TEXT NOT NULL CHECK ("role" IN ('admin', 'owner')),
  PRIMARY KEY ("userId", "groupId"),
  FOREIGN KEY ("userId") REFERENCES public."user" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("groupId") REFERENCES public."group" ("id") ON DELETE CASCADE
);

CREATE TABLE "user_presence" (
  "sessionId" TEXT NOT NULL,
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
  PRIMARY KEY ("sessionId", "fileId"),
  FOREIGN KEY ("fileId") REFERENCES public."file" ("id") ON DELETE CASCADE
);

CREATE TABLE "group_file" (
  "fileId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "createdAt" BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  "updatedAt" BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  PRIMARY KEY ("fileId", "groupId"),
  FOREIGN KEY ("fileId") REFERENCES public."file" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("groupId") REFERENCES public."group" ("id") ON DELETE CASCADE
);

ALTER PUBLICATION zero_data ADD TABLE public."group", public."group_user", public."group_file", public."user_presence";

-- Remove ownerId and publishedSlug from file table primary key
ALTER TABLE public."file" DROP CONSTRAINT "file_pkey";
ALTER TABLE public."file" ADD PRIMARY KEY ("id");


ALTER TABLE public."file" ALTER COLUMN "ownerId" DROP NOT NULL;
ALTER TABLE public."file" ADD COLUMN "owningGroupId" TEXT REFERENCES public."group"("id") ON DELETE CASCADE;

-- Add constraint to ensure exactly one of ownerId or owningGroupId is set
ALTER TABLE public."file" ADD CONSTRAINT "file_owner_xor_check" 
  CHECK (
    (("ownerId" IS NULL) != ("owningGroupId" IS NULL)) -- XOR: one must be null and one must be non-null
  );

CREATE INDEX "file_owning_group_id_idx" ON public."file" ("owningGroupId");

