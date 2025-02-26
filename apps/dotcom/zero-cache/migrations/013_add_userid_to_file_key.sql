ALTER TABLE "file"
DROP CONSTRAINT "file_pkey" CASCADE,
ADD PRIMARY KEY ("id", "ownerId"),
ADD CONSTRAINT "file_id_unique" UNIQUE ("id");

ALTER TABLE "asset"
ADD CONSTRAINT "asset_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file" ("id") ON DELETE CASCADE;

ALTER TABLE "file_state"
ADD CONSTRAINT "file_state_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file" ("id") ON DELETE CASCADE;