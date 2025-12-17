---
title: Zero cache
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - zero
  - cache
  - database
  - sync
  - postgres
  - rocicorp
---

The zero-cache is a specialized database caching and synchronization layer for tldraw's real-time collaboration system using Rocicorp's Zero framework.

## Overview

Zero-cache serves as an intermediary between PostgreSQL and client applications:

- Real-time offline-first synchronization
- Local SQLite replica for fast reads
- Automatic conflict resolution via CRDTs
- Selective data sync per user

## Architecture

```
PostgreSQL (Source of Truth)
     ↓ (Logical Replication)
Zero Server (Conflict Resolution)
     ↓
SQLite Replica (/data/sync-replica.db)
     ↓ (Real-time sync)
Client Applications
```

### Core components

**Zero server** - Primary synchronization engine from Rocicorp Zero

```typescript
{
  replicaFile: "/data/sync-replica.db",
  upstreamDB: postgresConnectionString,
  cvrDB: postgresConnectionString,
  changeDB: postgresConnectionString,
  authJWKSURL: "/.well-known/jwks.json",
  pushURL: "/app/zero/push",
  lazyStartup: true
}
```

**PostgreSQL** - Authoritative data source with logical replication

**PgBouncer** - Connection pooling for efficient database access

## Data model

### User table

```sql
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
  "colorScheme" VARCHAR
);
```

### File table

```sql
CREATE TABLE "file" (
  "id" VARCHAR PRIMARY KEY,
  "name" VARCHAR NOT NULL,
  "ownerId" VARCHAR NOT NULL,
  "thumbnail" VARCHAR NOT NULL,
  "shared" BOOLEAN NOT NULL,
  "sharedLinkType" VARCHAR NOT NULL,
  "published" BOOLEAN NOT NULL,
  "publishedSlug" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  "isEmpty" BOOLEAN NOT NULL,
  FOREIGN KEY ("ownerId") REFERENCES "user" ("id")
);
```

### File state table

Tracks per-user file interactions:

```sql
CREATE TABLE "file_state" (
  "userId" VARCHAR NOT NULL,
  "fileId" VARCHAR NOT NULL,
  "firstVisitAt" BIGINT,
  "lastEditAt" BIGINT,
  "lastVisitAt" BIGINT,
  "isPinned" BOOLEAN,
  PRIMARY KEY ("userId", "fileId")
);
```

## Conflict resolution

Zero employs multiple conflict resolution strategies:

### Last-write-wins (LWW)

```typescript
if (serverChange.timestamp > localChange.timestamp) {
  applyServerChange(serverChange)
} else {
  keepLocalChange(localChange)
}
```

### Causal consistency

Operations maintain proper ordering using vector clocks.

### Set-based CRDTs

Collections use add/remove semantics with guaranteed convergence.

## Client integration

```typescript
const zero = new Zero({
  server: 'https://zero-cache.tldraw.com',
  auth: () => getAuthToken(),
  schema: tldrawSchema,
})

// Query with real-time updates
const files = await zero.query.file
  .where('ownerId', userId)
  .or('shared', true)
  .run()

// Optimistic mutations
await zero.mutate.file.update({
  id: fileId,
  name: 'Updated Name',
})
```

## Migrations

Database migrations are managed with transactional safety:

```typescript
const migrate = async (summary: string[], dryRun: boolean) => {
  await db.transaction().execute(async (tx) => {
    for (const migration of migrations) {
      const migrationSql = readFileSync(`./migrations/${migration}`, 'utf8')
      await sql.raw(migrationSql).execute(tx)
    }
  })
}
```

## Development

```bash
# Start development environment
yarn dev

# This runs:
# 1. Docker containers (postgres + pgbouncer)
# 2. Database migrations
# 3. Schema bundling
# 4. Zero cache server
```

### Docker compose

```yaml
services:
  zstart_postgres:
    image: simonfuhrer/postgresql:16.1-wal2json
    command: |
      postgres
      -c wal_level=logical
      -c max_wal_senders=10
      -c max_replication_slots=5
    ports:
      - 6543:5432

  pgbouncer:
    image: edoburu/pgbouncer:latest
    ports:
      - '6432:6432'
```

## Production deployment

### Fly.io configuration

```toml
[[vm]]
memory = "2gb"
cpus = 2

[mounts]
source = "sqlite_db"
destination = "/data"

[http_service]
internal_port = 4848
auto_stop_machines = "off"
min_machines_running = 1
```

### Environment variables

```bash
ZERO_REPLICA_FILE="/data/sync-replica.db"
ZERO_UPSTREAM_DB="postgresql://..."
ZERO_CVR_DB="postgresql://..."
ZERO_CHANGE_DB="postgresql://..."
ZERO_AUTH_JWKS_URL="https://clerk.tldraw.com/.well-known/jwks.json"
```

## Performance

- **Sub-millisecond reads**: Local SQLite replica eliminates network latency
- **Optimistic updates**: UI updates immediately, syncs in background
- **Selective sync**: Only relevant user data synchronized
- **Connection efficiency**: Single persistent WebSocket per client

## Key files

- `apps/dotcom/zero-cache/` - Zero cache service
- `packages/dotcom-shared/src/tlaSchema.ts` - Database schema
- `apps/dotcom/zero-cache/migrations/` - Database migrations

## Related

- [Sync worker](./sync-worker.md) - WebSocket room management
- [Multiplayer architecture](../architecture/multiplayer.md) - Real-time collaboration
- [@tldraw/dotcom-shared](../packages/dotcom-shared.md) - Shared database types
