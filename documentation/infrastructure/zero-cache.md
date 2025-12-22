---
title: Zero cache
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - zero
  - cache
  - database
  - sync
  - postgres
  - rocicorp
---

Zero cache is the database synchronization layer for tldraw.com. It uses Rocicorp Zero to replicate data from Postgres into a local SQLite replica and stream changes to clients in real time.

## Key components

### Zero server

Zero manages replication, conflict resolution, and client sync. It is configured with Postgres connections and a local SQLite replica file:

```typescript
{
	replicaFile: '/data/sync-replica.db',
	upstreamDB: postgresConnectionString,
	cvrDB: postgresConnectionString,
	changeDB: postgresConnectionString,
	authJWKSURL: '/.well-known/jwks.json',
	pushURL: '/app/zero/push',
	lazyStartup: true,
}
```

### PostgreSQL and replication

Postgres is the source of truth. Logical replication feeds changes into Zero, and PgBouncer provides connection pooling.

### Migrations

Database schema updates are applied through SQL migrations in the zero-cache package.

## Data flow

1. Postgres emits logical replication events.
2. Zero applies changes to the SQLite replica and CRDT state.
3. Clients subscribe to live queries over a persistent connection.
4. Client mutations flow back through Zero to Postgres.

## Development workflow

```bash
yarn dev
```

## Key files

- apps/dotcom/zero-cache/migrate.ts - Migration runner
- apps/dotcom/zero-cache/migrations/ - SQL migrations
- apps/dotcom/zero-cache/docker/docker-compose.yml - Local Postgres and PgBouncer
- apps/dotcom/zero-cache/flyio.template.toml - Fly.io deployment template
- packages/dotcom-shared/src/tlaSchema.ts - Shared schema definitions

## Related

- [Sync worker](./sync-worker.md)
- [Multiplayer architecture](../architecture/multiplayer.md)
- [@tldraw/dotcom-shared](../packages/dotcom-shared.md)
