-- DO NOT SYNC. api_token holds hashed bearer tokens for the server-side RPC API.
-- It must NEVER reach clients via Zero or the file-change replicator.
-- Specifically:
--   * Do NOT add it to the `zero_data` publication (Zero subscribes to that).
--   * Do NOT add it to the wal2json `addTables` allowlist in TLPostgresReplicator.
--   * Do NOT add it to the Zero `schema` table list in packages/dotcom-shared/src/tlaSchema.ts.
-- The table is only accessed by sync-worker Kysely queries.

CREATE TABLE "api_token" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "createdAt" BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  "lastUsedAt" BIGINT,
  "revokedAt" BIGINT,
  FOREIGN KEY ("userId") REFERENCES public."user" ("id") ON DELETE CASCADE
);

CREATE INDEX "api_token_user_id_idx" ON public."api_token" ("userId");
CREATE INDEX "api_token_token_hash_idx" ON public."api_token" ("tokenHash");
