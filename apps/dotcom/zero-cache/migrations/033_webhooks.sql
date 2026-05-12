-- DO NOT SYNC. file_webhook holds per-file webhook subscriptions. It must NEVER
-- reach clients via Zero or the file-change replicator.
-- Specifically:
--   * Do NOT add it to the `zero_data` publication (Zero subscribes to that).
--   * Do NOT add it to the wal2json `addTables` allowlist in TLPostgresReplicator.
--   * Do NOT add it to the Zero `schema` table list in packages/dotcom-shared/src/tlaSchema.ts.
-- The table is only accessed by sync-worker Kysely queries.

CREATE TABLE "file_webhook" (
  "id" TEXT PRIMARY KEY,
  "fileId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "createdAt" BIGINT NOT NULL,
  CONSTRAINT "file_webhook_file_fk"
    FOREIGN KEY ("fileId")
    REFERENCES "file" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "file_webhook_user_fk"
    FOREIGN KEY ("userId")
    REFERENCES "user" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "file_webhook_file_id_idx" ON "file_webhook" ("fileId");
CREATE INDEX "file_webhook_user_id_idx" ON "file_webhook" ("userId");
