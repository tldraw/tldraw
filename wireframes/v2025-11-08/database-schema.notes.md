# Database Schema - Detailed Notes

## Overview

tldraw uses a multi-layered data persistence strategy with three distinct storage systems:

1. **PostgreSQL** - Server-side source of truth for tldraw.com
2. **IndexedDB** - Client-side local persistence
3. **TLStore** - In-memory reactive record system (synced between layers)

Each layer serves a specific purpose and has different characteristics.

## PostgreSQL Schema (tldraw.com Server)

### Purpose

Server-side persistent storage for:
- User accounts and authentication
- File ownership and metadata
- File versions and history
- Sharing and permissions
- Asset storage references
- Room state for multiplayer

### Tables

#### User Table

**Purpose:** User account information managed by Clerk.

```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,  -- Clerk user ID
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  avatar TEXT,  -- Avatar URL
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB  -- Additional user data
);

CREATE INDEX idx_users_email ON users(email);
```

**Key Points:**
- Primary user data managed by Clerk
- `id` is Clerk user ID
- `metadata` stores additional custom fields
- Email is unique and indexed

---

#### File Table

**Purpose:** File metadata and ownership.

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id VARCHAR(255) NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  publish_slug VARCHAR(255) UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,  -- Soft delete
  metadata JSONB
);

CREATE INDEX idx_files_owner ON files(owner_id);
CREATE INDEX idx_files_slug ON files(publish_slug) WHERE is_published = TRUE;
CREATE INDEX idx_files_deleted ON files(deleted_at) WHERE deleted_at IS NULL;
```

**Key Points:**
- UUID primary key
- Soft delete via `deleted_at`
- Published files have unique slug
- Metadata stores custom fields

**Soft Delete:**
- Files marked deleted via `deleted_at` timestamp
- Not permanently removed (can restore)
- Excluded from normal queries

---

#### FileVersion Table

**Purpose:** Complete file history with snapshots.

```sql
CREATE TABLE file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  snapshot JSONB NOT NULL,  -- Full TLStore snapshot
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  snapshot_size INT  -- Size in bytes
);

CREATE INDEX idx_versions_file ON file_versions(file_id, created_at DESC);
CREATE INDEX idx_versions_user ON file_versions(user_id);
```

**Key Points:**
- Full TLStore snapshot in JSONB
- Chronological versioning
- Created by specific user
- Size tracked for storage limits

**Snapshot Format:**
```json
{
  "store": {
    "shape:abc-123": { "type": "geo", "x": 100, ... },
    "shape:def-456": { "type": "text", ... },
    ...
  },
  "schema": {
    "schemaVersion": 1,
    "storeVersion": 1,
    "recordVersions": { ... }
  }
}
```

---

#### FileState Table

**Purpose:** Current state of file (denormalized for performance).

```sql
CREATE TABLE file_state (
  file_id UUID PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
  state JSONB NOT NULL,  -- Current TLStore state
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX idx_state_updated ON file_state(updated_at);
```

**Key Points:**
- One-to-one with File
- Denormalized current state
- Version number for optimistic locking
- Updated frequently during collaboration

**Why Separate Table:**
- Frequently updated (every edit)
- Large JSONB blob
- Separating reduces File table bloat
- Can archive old versions

---

#### FileShare Table

**Purpose:** File sharing and permissions.

```sql
CREATE TYPE share_role AS ENUM ('viewer', 'editor', 'owner');

CREATE TABLE file_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  granted_by VARCHAR(255) NOT NULL REFERENCES users(id),
  role share_role NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP,

  UNIQUE(file_id, user_id, revoked_at)
);

CREATE INDEX idx_shares_file ON file_shares(file_id);
CREATE INDEX idx_shares_user ON file_shares(user_id);
CREATE INDEX idx_shares_active ON file_shares(file_id, user_id)
  WHERE revoked_at IS NULL;
```

**Key Points:**
- Granular permissions (viewer, editor, owner)
- Audit trail (granted_by)
- Revocable (revoked_at)
- Multiple shares per file

**Roles:**
- **viewer** - Read-only access
- **editor** - Can edit and comment
- **owner** - Full control, can share

---

#### Session Table

**Purpose:** User session management.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  token_hash VARCHAR(255) NOT NULL,  -- Hashed session token
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  metadata JSONB
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

**Key Points:**
- Session tokens hashed (security)
- Expiration enforced
- Per-user session tracking
- Metadata for session context

**Cleanup:**
- Expired sessions periodically deleted
- Job runs daily to prune old sessions

---

#### Asset Table

**Purpose:** Asset metadata and R2 references.

```sql
CREATE TABLE assets (
  id VARCHAR(255) PRIMARY KEY,  -- SHA256 hash
  url TEXT NOT NULL,  -- R2 object URL
  type VARCHAR(50) NOT NULL,  -- image, video, etc.
  size INT NOT NULL,  -- Bytes
  width INT,  -- Image width (if applicable)
  height INT,  -- Image height (if applicable)
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  uploaded_by VARCHAR(255) REFERENCES users(id)
);

CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_assets_uploader ON assets(uploaded_by);
```

**Key Points:**
- Primary key is content hash (SHA256)
- Automatic deduplication (same file = same hash)
- R2 URL for actual storage
- Metadata extracted (dimensions, size)

**Deduplication:**
```
User A uploads cat.jpg → SHA256: abc123
User B uploads same cat.jpg → SHA256: abc123 (reused)
Only one copy stored in R2
```

---

#### Room Table

**Purpose:** Multiplayer room state (Durable Objects).

**Note:** This is actually stored in Durable Object storage, but conceptually similar to a table.

```typescript
// Durable Object storage (key-value)
{
  "room:xyz-789": {
    id: "xyz-789",
    fileId: "file-uuid",
    state: { /* TLStore snapshot */ },
    createdAt: "2024-01-01T00:00:00Z",
    lastActivity: "2024-01-01T12:30:00Z",
    participantCount: 3
  }
}
```

**Key Points:**
- Stored in Durable Objects (not PostgreSQL)
- Transactional room state
- Global consistency per room
- Automatic hibernation when inactive

---

#### RoomPresence Table

**Purpose:** Real-time user presence (cursors, selections).

**Note:** Ephemeral, not persisted to PostgreSQL.

```typescript
// In-memory in Durable Object
{
  presences: {
    "user-123-session-abc": {
      userId: "user-123",
      userName: "Alice",
      cursor: { x: 450, y: 320 },
      selectedShapeIds: ["shape-1"],
      brush: null,
      updatedAt: Date.now()
    }
  }
}
```

**Key Points:**
- Ephemeral (not persisted)
- Broadcast to all room participants
- Throttled updates (~60fps max)
- Automatically cleaned up on disconnect

---

## IndexedDB Schema (Client-Side)

### Purpose

Local browser storage for:
- Offline editing
- Fast load times
- Persistence without server
- User preferences

### Object Stores

#### LocalStore Object Store

**Purpose:** Persisted TLStore snapshots.

```typescript
{
  key: "my-app-v1",  // Persistence key
  snapshot: {
    store: { /* all records */ },
    schema: { /* schema info */ }
  },
  updatedAt: 1234567890,
  version: 1
}
```

**Key Points:**
- One entry per persistence key
- Debounced saves (every 2s idle)
- Full store snapshot
- Schema version for migrations

**Storage Location:**
```
IndexedDB > tldraw > stores > "my-app-v1"
```

---

#### LocalAsset Object Store

**Purpose:** Cached asset blobs.

```typescript
{
  id: "asset-abc-123",
  data: Blob,  // Binary data
  type: "image/png",
  size: 524288,  // 512 KB
  cachedAt: 1234567890
}
```

**Key Points:**
- Blob storage for images/videos
- Reduces network requests
- LRU eviction when full
- Browser quota limits apply

**Cache Strategy:**
- Store recently used assets
- Evict least recently used when quota exceeded
- Re-fetch from server if evicted

---

#### UserPreferences Object Store

**Purpose:** User settings and preferences.

```typescript
{
  key: "theme",
  value: "dark",
  updatedAt: 1234567890
}

{
  key: "recentColors",
  value: ["#ff0000", "#00ff00", "#0000ff"],
  updatedAt: 1234567890
}
```

**Key Points:**
- Simple key-value storage
- Survives session/tab close
- Synced across tabs (same origin)
- Not synced to server

**Common Preferences:**
- Theme (light/dark)
- Recent colors
- Tool preferences
- UI state (collapsed panels, etc.)

---

## TLStore Record Types (In-Memory)

### Purpose

Core reactive data model used by the editor. Synced between:
- Client memory
- IndexedDB (local)
- Server (via sync protocol)

All record types inherit from `BaseRecord`:
```typescript
interface BaseRecord {
  id: string
  typeName: string
}
```

### Record Types

#### TLShape

**Purpose:** Individual shapes on the canvas.

```typescript
interface TLShape extends BaseRecord {
  id: string  // e.g., "shape:abc-123"
  typeName: "shape"
  type: "text" | "geo" | "arrow" | ...
  parentId: string | null  // Parent shape or page
  index: string  // Fractional index for ordering
  x: number
  y: number
  rotation: number
  isLocked: boolean
  props: {
    // Shape-specific properties
    // e.g., for Geo: { geo: "rectangle", w: 100, h: 50 }
  }
  meta: Record<string, any>  // User metadata
}
```

**Shape Types:**
- text, draw, geo, arrow, note, frame
- line, highlight, image, video
- bookmark, embed

**Hierarchy:**
- Shapes can have parent shapes (groups, frames)
- Pages contain top-level shapes
- Fractional indexing for ordering

---

#### TLBinding

**Purpose:** Relationships between shapes (e.g., arrows to shapes).

```typescript
interface TLBinding extends BaseRecord {
  id: string  // e.g., "binding:xyz-789"
  typeName: "binding"
  type: "arrow"  // Binding type
  fromId: string  // Source shape ID
  toId: string  // Target shape ID
  props: {
    // Binding-specific properties
    // e.g., for arrow: { terminal: "start", normalizedAnchor: {x: 0.5, y: 0.5} }
  }
  meta: Record<string, any>
}
```

**Binding Types:**
- **arrow** - Arrow connections to shapes

**Lifecycle:**
- Created when arrow connects to shape
- Updated when connected shape moves
- Deleted when shape deleted

---

#### TLPage

**Purpose:** Pages in the document.

```typescript
interface TLPage extends BaseRecord {
  id: string  // e.g., "page:page-1"
  typeName: "page"
  name: string  // Page name
  index: string  // Page order
  meta: Record<string, any>
}
```

**Key Points:**
- Each document has multiple pages
- Current page determines visible shapes
- Pages ordered by fractional index

---

#### TLAsset (Record)

**Purpose:** Asset metadata (images, videos, bookmarks).

```typescript
interface TLAsset extends BaseRecord {
  id: string  // e.g., "asset:img-123"
  typeName: "asset"
  type: "image" | "video" | "bookmark"
  props: {
    // Type-specific properties
    // Image: { src: string, w: number, h: number, mimeType: string }
    // Video: { src: string, w: number, h: number }
    // Bookmark: { title: string, description: string, image: string, url: string }
  }
  meta: Record<string, any>
}
```

**Asset Flow:**
1. User drops file
2. Temporary asset created (blob URL)
3. Upload to server
4. Asset updated with final URL

---

#### TLCamera

**Purpose:** Camera/viewport state.

```typescript
interface TLCamera extends BaseRecord {
  id: string  // e.g., "camera:instance"
  typeName: "camera"
  x: number  // Camera X position
  y: number  // Camera Y position
  z: number  // Zoom level (1.0 = 100%)
}
```

**Key Points:**
- One camera per instance
- Updated on pan/zoom
- Persisted for returning users

---

#### TLInstancePresence

**Purpose:** User presence (cursors, selections) in multiplayer.

```typescript
interface TLInstancePresence extends BaseRecord {
  id: string  // e.g., "instance_presence:user-123"
  typeName: "instance_presence"
  userId: string
  userName: string
  userColor: string
  cursor: { x: number, y: number, type: string, rotation: number }
  selectedShapeIds: string[]
  brush: { x: number, y: number, w: number, h: number } | null
  scribbles: any[]
  meta: Record<string, any>
}
```

**Key Points:**
- One per connected user
- Ephemeral (not persisted)
- Synced in real-time
- Automatically removed on disconnect

---

#### TLPointer

**Purpose:** Pointer/cursor state.

```typescript
interface TLPointer extends BaseRecord {
  id: string  // e.g., "pointer:pointer"
  typeName: "pointer"
  x: number
  y: number
  lastActivityTimestamp: number
}
```

**Key Points:**
- Tracks local pointer position
- Used for hover states
- Updated on mouse move

---

#### TLDocument

**Purpose:** Document-level metadata.

```typescript
interface TLDocument extends BaseRecord {
  id: string  // e.g., "document:doc"
  typeName: "document"
  name: string
  meta: Record<string, any>
}
```

**Key Points:**
- One per document
- Stores document-level settings
- Name displayed in UI

---

#### TLInstancePageState

**Purpose:** Per-instance page state (selection, editing, etc.).

```typescript
interface TLInstancePageState extends BaseRecord {
  id: string  // e.g., "instance_page_state:page-1"
  typeName: "instance_page_state"
  pageId: string
  selectedShapeIds: string[]
  erasingShapeIds: string[]
  editingShapeId: string | null
  hoveredShapeId: string | null
  focusedGroupId: string | null
  // ... more state
}
```

**Key Points:**
- One per page per instance
- Tracks current selections
- Editing state
- Not synced (instance-local)

---

## Record Scopes

Records have different persistence strategies based on scope:

### Document Scope
- **Persisted:** Yes
- **Synced:** Yes
- **Examples:** TLShape, TLBinding, TLPage, TLAsset, TLDocument

### Session Scope
- **Persisted:** Maybe (local only)
- **Synced:** No
- **Examples:** TLCamera, TLInstancePageState

### Presence Scope
- **Persisted:** No
- **Synced:** Yes (ephemeral)
- **Examples:** TLInstancePresence

---

## Indexing Strategy

### PostgreSQL Indexes

**File Queries:**
- `idx_files_owner` - Files by owner
- `idx_files_slug` - Published files by slug
- `idx_files_deleted` - Active files (excludes deleted)

**Version Queries:**
- `idx_versions_file` - Versions chronologically per file
- `idx_versions_user` - Versions by user

**Share Queries:**
- `idx_shares_file` - All shares for file
- `idx_shares_user` - Files shared with user
- `idx_shares_active` - Active shares only

**Asset Queries:**
- `idx_assets_type` - Assets by type
- `idx_assets_uploader` - Assets by uploader

---

### IndexedDB Indexes

**LocalStore:**
- Primary key: `key` (persistence key)
- No additional indexes needed

**LocalAsset:**
- Primary key: `id`
- Index: `cachedAt` (for LRU eviction)

---

### TLStore Reactive Indexes

**Automatic indexes via `store.query.index()`:**
```typescript
// Index shapes by type
const shapesByType = store.query.index('shape', 'type')
const geoShapes = shapesByType.get().get('geo')

// Index shapes by parent
const shapesByParent = store.query.index('shape', 'parentId')
const childShapes = shapesByParent.get().get(parentId)
```

**Key Points:**
- Reactive - updates automatically
- Incremental - uses diffs
- Efficient - O(1) lookups
- Cached - computed values

---

## Migration Strategy

### PostgreSQL Migrations

**Tools:** Custom migration system in `/internal/scripts/`

**Process:**
1. Write migration SQL
2. Run migration script
3. Update schema version
4. Deploy

**Example Migration:**
```sql
-- V2__add_file_metadata.sql
ALTER TABLE files
ADD COLUMN metadata JSONB DEFAULT '{}';

CREATE INDEX idx_files_metadata ON files USING gin(metadata);
```

---

### TLStore Migrations

**Version-Based:**
```typescript
const migrations = createMigrationSequence({
  sequenceId: 'com.tldraw.shape',
  sequence: [
    {
      id: 'com.tldraw.shape/1',
      up: (record: any) => {
        // Migrate from v0 to v1
        record.newField = defaultValue
        return record
      },
      down: (record: any) => {
        // Migrate from v1 to v0
        delete record.newField
        return record
      }
    }
  ]
})
```

**Key Points:**
- Forward and backward migrations
- Automatic on store load
- Version tracking per record type
- Validation after migration

---

## Backup and Recovery

### PostgreSQL Backups

**Strategy:**
- Automated daily backups
- Point-in-time recovery
- Retained for 30 days
- Offsite replication

**Recovery:**
```bash
# Restore from backup
pg_restore -d tldraw backup.dump

# Point-in-time recovery
# Restore to specific timestamp
```

---

### IndexedDB Recovery

**Strategy:**
- Local storage only
- No automatic backups
- User can export manually

**Export:**
```typescript
const snapshot = editor.store.getSnapshot()
const json = JSON.stringify(snapshot)
// User downloads JSON file
```

**Import:**
```typescript
const snapshot = JSON.parse(json)
editor.store.loadSnapshot(snapshot)
```

---

## Performance Considerations

### PostgreSQL Optimization

**JSONB Performance:**
- Indexed with GIN for fast queries
- Partial indexes on specific JSON paths
- Avoid deep nesting

**Query Optimization:**
- Use prepared statements
- Connection pooling
- Read replicas for reads
- Write to primary only

---

### IndexedDB Optimization

**Storage Limits:**
- Browser-dependent (usually ~50% of available disk)
- Quota API for checking limits
- LRU eviction when full

**Performance:**
- Async operations (don't block UI)
- Batch operations when possible
- Index on frequently queried fields

---

### TLStore Optimization

**Memory Management:**
- Lazy loading of large documents
- Pagination for many shapes
- Dispose unused computed values
- Clean up listeners

**Query Performance:**
- Use reactive indexes
- Avoid full scans
- Cache computed results
- Batch updates

---

## Data Privacy & Security

### Encryption

**At Rest:**
- PostgreSQL: Encrypted volumes
- R2: Server-side encryption
- IndexedDB: No encryption (browser storage)

**In Transit:**
- HTTPS for all HTTP
- WSS for WebSocket
- TLS 1.3

---

### Access Control

**PostgreSQL:**
- Row-level security policies
- Role-based access
- Audit logging

**API:**
- JWT authentication
- Permission checks
- Rate limiting

---

## Monitoring

### PostgreSQL Monitoring

**Metrics:**
- Query performance
- Connection pool usage
- Table sizes
- Index usage

**Alerts:**
- Slow queries
- Connection errors
- Storage capacity

---

### IndexedDB Monitoring

**Metrics:**
- Storage usage
- Error rates
- Save frequency

**Debugging:**
- Browser DevTools > Application > IndexedDB
- Inspect object stores
- View stored data
