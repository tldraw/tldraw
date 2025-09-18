# Zero Cache Context

## Overview

The `zero-cache` is a specialized database caching and synchronization layer for tldraw's real-time collaboration system. It serves as an intermediary between the PostgreSQL database and client applications, providing efficient data synchronization using Rocicorp's Zero framework. The system enables real-time, offline-first synchronization of user data, file metadata, and collaborative state across all tldraw applications.

## Architecture

### Core Components

The zero-cache system consists of several integrated components:

#### Zero Server (Rocicorp Zero)

The primary synchronization engine that provides:

```typescript
// Zero server configuration
{
  replicaFile: "/data/sync-replica.db",        // Local SQLite cache
  upstreamDB: postgresConnectionString,        // Source of truth
  cvrDB: postgresConnectionString,             // Conflict resolution database
  changeDB: postgresConnectionString,          // Change log database
  authJWKSURL: "/.well-known/jwks.json",       // JWT verification
  pushURL: "/app/zero/push",                   // Mutation endpoint
  lazyStartup: true                            // Performance optimization
}
```

#### PostgreSQL Database

The authoritative data source with logical replication enabled:

```sql
-- Core tables for tldraw data
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
  -- User preferences (optional)
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
```

#### PgBouncer Connection Pool

Efficient connection pooling for database access:

```ini
[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
pool_mode = transaction    # Efficient transaction-level pooling
max_client_conn = 450     # High concurrency support
default_pool_size = 100   # Connection pool size
max_prepared_statements = 10
```

### Data Synchronization Flow

The zero-cache implements a sophisticated data flow:

#### 1. Database Change Detection

PostgreSQL logical replication streams changes to Zero:

```sql
-- Enable logical replication
CREATE PUBLICATION zero_data FOR TABLE file, file_state, public.user;

-- Full replica identity for complete change tracking
ALTER TABLE file REPLICA IDENTITY FULL;
ALTER TABLE file_state REPLICA IDENTITY FULL;
```

#### 2. Local Caching

Zero maintains a local SQLite replica for performance:

```
PostgreSQL (Source of Truth)
     ↓ (Logical Replication)
SQLite Replica (/data/sync-replica.db)
     ↓ (Real-time sync)
Client Applications
```

#### 3. Conflict Resolution

Zero handles conflicts using Conflict-Free Replicated Data Types (CRDTs):

- **Last-Write-Wins**: For simple field updates
- **Causal Ordering**: For maintaining operation sequences
- **Vector Clocks**: For distributed state tracking

## Database Schema Evolution

### Migration System

The zero-cache includes a comprehensive migration system:

```typescript
// Migration runner with transactional safety
const migrate = async (summary: string[], dryRun: boolean) => {
	await db.transaction().execute(async (tx) => {
		const appliedMigrations = await sql`
      SELECT filename FROM migrations.applied_migrations
    `.execute(tx)

		for (const migration of migrations) {
			if (!appliedMigrations.includes(migration)) {
				const migrationSql = readFileSync(`./migrations/${migration}`, 'utf8')
				await sql.raw(migrationSql).execute(tx)
				await sql`
          INSERT INTO migrations.applied_migrations (filename) VALUES (${migration})
        `.execute(tx)
			}
		}
	})
}
```

### Schema Evolution Examples

Key migrations that shaped the current schema:

#### User Preferences Enhancement

```sql
-- Migration 019: Add keyboard shortcuts preference
ALTER TABLE "user" ADD COLUMN "areKeyboardShortcutsEnabled" BOOLEAN;

-- Migration 020: Add UI labels preference
ALTER TABLE "user" ADD COLUMN "showUiLabels" BOOLEAN;
```

#### File Sharing and Collaboration

```sql
-- Migration 006: Soft deletion support
ALTER TABLE "file" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE;

-- Migration 008: File pinning
ALTER TABLE "file_state" ADD COLUMN "isPinned" BOOLEAN;

-- Migration 004: Guest access
ALTER TABLE "file_state" ADD COLUMN "isFileOwner" BOOLEAN;
```

#### Asset Management

```sql
-- Migration 010: Asset information
CREATE TABLE "asset" (
  "objectName" VARCHAR PRIMARY KEY,
  "fileId" VARCHAR NOT NULL,
  "userId" VARCHAR,
  FOREIGN KEY ("fileId") REFERENCES "file" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE SET NULL
);
```

### Database Triggers

Automated data consistency through triggers:

```sql
-- Automatically clean up file states when sharing is disabled
CREATE OR REPLACE FUNCTION delete_file_states() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.shared = TRUE AND NEW.shared = FALSE THEN
    DELETE FROM file_state
    WHERE "fileId" = OLD.id AND OLD."ownerId" != "userId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER file_shared_update
AFTER UPDATE OF shared ON file
FOR EACH ROW
EXECUTE FUNCTION delete_file_states();
```

## Development Environment

### Docker Composition

Local development stack with Docker Compose:

```yaml
services:
  zstart_postgres:
    image: simonfuhrer/postgresql:16.1-wal2json
    environment:
      POSTGRES_USER: user
      POSTGRES_DB: postgres
      POSTGRES_PASSWORD: password
    command: |
      postgres 
      -c wal_level=logical           # Enable logical replication
      -c max_wal_senders=10          # Multiple replication slots
      -c max_replication_slots=5     # Concurrent replications
      -c max_connections=300         # High concurrency
      -c hot_standby=on             # Read replicas support
      -c hot_standby_feedback=on    # Replication feedback
    ports:
      - 6543:5432
    volumes:
      - tlapp_pgdata:/var/lib/postgresql/data

  pgbouncer:
    image: edoburu/pgbouncer:latest
    ports:
      - '6432:6432'
    environment:
      DATABASE_URL: postgres://user:password@zstart_postgres:5432/postgres
```

### Development Workflow

```bash
# Start the complete development environment
yarn dev

# This concurrently runs:
# 1. Docker containers (postgres + pgbouncer)
# 2. Database migrations
# 3. Schema bundling and watching
# 4. Zero cache server
```

#### Schema Bundling

Dynamic schema compilation for Zero:

```bash
# Bundle the shared schema for Zero consumption
esbuild --bundle --platform=node --format=esm \
  --outfile=./.schema.js \
  ../../../packages/dotcom-shared/src/tlaSchema.ts

# Watch mode for development
nodemon --watch ./.schema.js \
  --exec 'zero-cache-dev -p ./.schema.js' \
  --signal SIGINT
```

### Environment Management

Environment variables for different deployment stages:

#### Development

```bash
BOTCOM_POSTGRES_POOLED_CONNECTION_STRING="postgresql://user:password@127.0.0.1:6432/postgres"
ZERO_REPLICA_FILE="/tmp/sync-replica.db"
```

#### Production (Fly.io Template)

```toml
[env]
ZERO_REPLICA_FILE = "/data/sync-replica.db"
ZERO_UPSTREAM_DB = "__BOTCOM_POSTGRES_CONNECTION_STRING"
ZERO_CVR_DB = "__BOTCOM_POSTGRES_CONNECTION_STRING"
ZERO_CHANGE_DB = "__BOTCOM_POSTGRES_CONNECTION_STRING"
ZERO_AUTH_JWKS_URL = "https://clerk.staging.tldraw.com/.well-known/jwks.json"
ZERO_PUSH_URL = "__ZERO_PUSH_URL"
ZERO_LAZY_STARTUP = 'true'
```

## Data Model and Relationships

### User Management

Complete user profile and preferences:

```typescript
interface User {
	id: string // Unique user identifier
	name: string // Display name
	email: string // Authentication email
	avatar: string // Profile image URL
	color: string // User color for collaboration

	// Export preferences
	exportFormat: 'svg' | 'png' | 'jpeg' | 'webp'
	exportTheme: 'light' | 'dark' | 'auto'
	exportBackground: boolean // Include background in exports
	exportPadding: boolean // Add padding to exports

	// Editor preferences
	locale?: string // Language/region
	animationSpeed?: number // UI animation timing
	edgeScrollSpeed?: number // Canvas edge scrolling speed
	colorScheme?: 'light' | 'dark' // UI theme preference
	areKeyboardShortcutsEnabled?: boolean // Keyboard shortcuts toggle
	enhancedA11yMode?: boolean // Enhanced accessibility mode

	// Drawing preferences
	isSnapMode?: boolean // Shape snapping
	isWrapMode?: boolean // Text wrapping
	isDynamicSizeMode?: boolean // Dynamic shape sizing
	isPasteAtCursorMode?: boolean // Paste behavior

	// Metadata
	createdAt: number // Account creation timestamp
	updatedAt: number // Last update timestamp
	flags: string // Feature flags (JSON)
}
```

### File Management

Comprehensive file metadata and sharing:

```typescript
interface File {
	id: string // Unique file identifier
	name: string // File display name
	ownerId: string // Owner user ID
	thumbnail: string // Preview image URL

	// Sharing configuration
	shared: boolean // Public sharing enabled
	sharedLinkType: 'view' | 'edit' // Sharing permissions

	// Publishing
	published: boolean // Published to public gallery
	lastPublished: number // Last publication timestamp
	publishedSlug: string // Public URL slug

	// State tracking
	isEmpty: boolean // File has no content
	isDeleted?: boolean // Soft deletion flag
	createSource?: string // Source for file creation

	// Metadata
	createdAt: number // File creation timestamp
	updatedAt: number // Last modification timestamp
}
```

### User-File Relationships

Per-user file interaction state:

```typescript
interface FileState {
	userId: string // User identifier
	fileId: string // File identifier

	// Visit tracking
	firstVisitAt?: number // Initial access timestamp
	lastVisitAt?: number // Recent access timestamp
	lastEditAt?: number // Recent edit timestamp

	// Session state
	lastSessionState?: string // Saved editor state (JSON)

	// User relationship
	isFileOwner?: boolean // User owns this file
	isPinned?: boolean // File pinned to user's list
}
```

### Mutation Tracking

Change tracking for synchronization:

```typescript
interface UserMutationNumber {
	userId: string // User identifier
	mutationNumber: number // Last processed mutation ID
}
```

## Real-Time Synchronization

### Client-Server Protocol

Zero implements a sophisticated sync protocol:

#### Initial Data Loading

```typescript
// Client connects and receives initial dataset
const zero = new Zero({
	server: 'https://zero-cache.tldraw.com',
	auth: () => getAuthToken(),
	schema: tldrawSchema,
})

// Zero automatically syncs relevant user data
const files = await zero.query.file.where('ownerId', userId).or('shared', true).run()
```

#### Real-Time Updates

```typescript
// Client mutations are immediately optimistic
await zero.mutate.file.update({
	id: fileId,
	name: 'Updated Name',
})

// Server processes and broadcasts changes
// Conflicts resolved automatically using CRDTs
```

#### Offline Support

```typescript
// Zero maintains local state during disconnection
// Queues mutations for replay when reconnected
// Handles conflict resolution upon reconnection
```

### Conflict Resolution Strategies

Zero employs multiple conflict resolution approaches:

#### Last-Write-Wins (LWW)

```typescript
// Simple fields use timestamp-based resolution
if (serverChange.timestamp > localChange.timestamp) {
	applyServerChange(serverChange)
} else {
	keepLocalChange(localChange)
}
```

#### Causal Consistency

```typescript
// Operations maintain causal ordering
// Vector clocks ensure proper sequencing
// Prevents causality violations
```

#### Set-based CRDTs

```typescript
// Collections use add/remove semantics
// Convergence guaranteed regardless of order
// No conflicts for set operations
```

## Production Deployment

### Fly.io Configuration

The zero-cache deploys to Fly.io with specialized configuration:

#### Resource Allocation

```toml
[[vm]]
memory = "2gb"          # Sufficient for caching and processing
cpu_kind = "shared"     # Cost-effective shared CPUs
cpus = 2               # Dual-core for concurrency

[http_service]
internal_port = 4848            # Zero server port
force_https = true             # Security requirement
auto_stop_machines = "off"     # Always-on for real-time sync
min_machines_running = 1       # High availability
```

#### Persistent Storage

```toml
[mounts]
source = "sqlite_db"          # Persistent volume for replica
destination = "/data"         # Mount point for SQLite file
```

#### Health Monitoring

```toml
[[http_service.checks]]
grace_period = "10s"          # Startup grace period
interval = "30s"              # Health check frequency
method = "GET"                # HTTP health endpoint
timeout = "5s"                # Request timeout
path = "/"                    # Health check path
```

### Production Considerations

#### Database Configuration

```sql
-- Production PostgreSQL settings for logical replication
wal_level = logical                    -- Enable change streaming
max_wal_senders = 20                   -- Multiple replicas
max_replication_slots = 10             -- Concurrent replication
max_connections = 500                  -- High concurrency
shared_preload_libraries = 'wal2json'  -- JSON change format
```

#### Connection Pooling

```ini
# Production PgBouncer configuration
[pgbouncer]
pool_mode = transaction               # Efficient pooling
max_client_conn = 1000               # High concurrency
default_pool_size = 200              # Large pool
max_prepared_statements = 50         # Statement caching
query_wait_timeout = 30              # Timeout protection
```

#### Monitoring and Alerting

```typescript
// Built-in Zero metrics
{
  replicationLag: number,            // Sync delay from PostgreSQL
  activeConnections: number,         // Current client count
  mutationRate: number,              // Changes per second
  conflictRate: number,              // Conflicts per second
  cacheHitRatio: number             // Local cache effectiveness
}
```

## Performance Optimizations

### Caching Strategy

Multi-layer caching for optimal performance:

#### Local SQLite Replica

```typescript
// Zero maintains local copy of relevant data
// Eliminates network round-trips for reads
// Instant query responses from local cache
const localData = await zero.query.local.file.findMany()
```

#### Query Optimization

```typescript
// Zero optimizes queries automatically
// Indexes created based on query patterns
// Batch loading for related data
const filesWithStates = await zero.query.file
	.include({ states: true })
	.where('ownerId', userId)
	.run()
```

#### Connection Efficiency

```typescript
// Single persistent connection per client
// Multiplexed operations over WebSocket
// Automatic reconnection with backoff
const zero = new Zero({
	server: 'wss://zero-cache.tldraw.com',
	reconnect: {
		maxAttempts: Infinity,
		backoff: 'exponential',
		maxDelay: 30000,
	},
})
```

### Scalability Features

#### Horizontal Scaling

```toml
# Multiple Zero cache instances
# Load balanced across regions
# Each instance maintains subset of data
# Automatic failover and recovery
```

#### Resource Management

```typescript
// Memory-efficient data structures
// Lazy loading of large datasets
// Automatic garbage collection
// Connection pooling and reuse
```

#### Network Optimization

```typescript
// Delta compression for changes
// Binary protocol for efficiency
// Request batching and coalescing
// Intelligent prefetching
```

## Maintenance and Operations

### Database Maintenance

#### Migration Management

```bash
# Apply new migrations
yarn migrate

# Dry-run to preview changes
yarn migrate --dry-run

# View migration status
yarn migrate --status
```

#### Data Cleanup

```bash
# Complete environment reset
yarn clean

# This removes:
# - Docker volumes
# - SQLite replica files
# - Cached schema bundles
```

#### Backup and Recovery

```sql
-- PostgreSQL logical backup
pg_dump --format=custom --verbose \
  --host=postgres.tldraw.com \
  --dbname=postgres \
  --file=backup.dump

-- Restore from backup
pg_restore --verbose --clean --no-acl --no-owner \
  --host=postgres.tldraw.com \
  --dbname=postgres \
  backup.dump
```

### Monitoring and Debugging

#### Performance Monitoring

```typescript
// Zero provides built-in metrics
{
  syncLatency: number,              // Client-server sync time
  queryPerformance: {
    averageTime: number,            // Average query execution
    slowQueries: Array<{
      sql: string,
      duration: number
    }>
  },
  connectionHealth: {
    activeConnections: number,
    failedConnections: number,
    reconnectAttempts: number
  }
}
```

#### Error Tracking

```typescript
// Comprehensive error logging
zero.on('error', (error) => {
	console.error('Zero Cache Error:', {
		type: error.type,
		message: error.message,
		stack: error.stack,
		context: error.context,
	})
})
```

#### Debug Logging

```bash
# Enable debug logging
LOG_LEVEL=debug yarn zero-server

# Trace-level logging for deep debugging
LOG_LEVEL=trace yarn zero-server
```

## Key Features

### Real-Time Synchronization

- **Instant Updates**: Changes appear immediately across all connected clients
- **Offline Support**: Full functionality during network disconnection
- **Conflict Resolution**: Automatic handling of concurrent modifications
- **Selective Sync**: Only relevant data synchronized per user

### Developer Experience

- **Type Safety**: Full TypeScript integration with generated types
- **Schema Evolution**: Safe database migrations with rollback support
- **Hot Reloading**: Automatic schema updates during development
- **Testing Support**: In-memory mode for unit testing

### Production Ready

- **High Availability**: Multi-region deployment with failover
- **Scalability**: Horizontal scaling across multiple instances
- **Performance**: Sub-millisecond query responses from local cache
- **Reliability**: Transactional consistency with automatic recovery

### Data Consistency

- **ACID Transactions**: Full transactional support for complex operations
- **Causal Consistency**: Operations maintain proper ordering
- **Eventual Consistency**: Guaranteed convergence across all clients
- **Schema Validation**: Type-safe data with runtime validation

## Integration with tldraw Ecosystem

### Client Integration

Zero-cache integrates seamlessly with tldraw applications:

```typescript
// React integration
const useFiles = () => {
	const zero = useZero()
	return zero.useQuery((z) => z.file.where('ownerId', userId).run())
}

// Real-time subscriptions
const useFileUpdates = (fileId: string) => {
	const zero = useZero()
	return zero.useQuery((z) => z.file.where('id', fileId).run())
}
```

### Service Architecture

```
tldraw.com Client
├── Zero Cache (Real-time sync)
├── Sync Worker (WebSocket rooms)
└── PostgreSQL (Source of truth)
     ↓
Logical Replication
     ↓
Zero Server (Conflict resolution)
     ↓
SQLite Replica (Local cache)
     ↓
Client Applications (Offline-first)
```

### Data Flow

```
User Action (Client)
     ↓
Optimistic Update (Immediate UI)
     ↓
Zero Mutation (Background sync)
     ↓
PostgreSQL Update (Persistent)
     ↓
Logical Replication (Change stream)
     ↓
Zero Server Processing (Conflict resolution)
     ↓
Client Synchronization (Real-time updates)
```

The zero-cache serves as the foundational data synchronization layer for tldraw's collaborative ecosystem, enabling real-time, offline-first user experiences while maintaining data consistency and providing excellent developer ergonomics.
