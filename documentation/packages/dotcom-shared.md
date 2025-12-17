---
title: "@tldraw/dotcom-shared"
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - dotcom
  - shared
  - database
  - schema
  - api
---

The `@tldraw/dotcom-shared` package contains shared code between the tldraw.com web application and its worker services. It provides the database schema, optimistic state management, permissions, and API types for the collaborative tldraw platform.

## Overview

This package serves as the shared foundation for tldraw.com infrastructure:

- **Database schema**: User, file, and file_state table definitions
- **Optimistic state**: Client-side optimistic update management
- **Permissions**: Row-level security for collaborative features
- **Mutation system**: Type-safe database operations
- **API types**: Client-server communication contracts

## Database schema

The schema uses Rocicorp Zero for real-time collaboration.

### Users table

```typescript
const user = table('user')
  .columns({
    id: string(),
    name: string(),
    email: string(),
    avatar: string(),
    color: string(),
    // Export preferences
    exportFormat: string(),
    exportTheme: string(),
    exportBackground: boolean(),
    exportPadding: boolean(),
    // Timestamps
    createdAt: number(),
    updatedAt: number(),
    // User preferences (optional)
    locale: string().optional(),
    animationSpeed: number().optional(),
    colorScheme: string().optional(),
    isSnapMode: boolean().optional(),
    // ... more preferences
  })
  .primaryKey('id')
```

### Files table

```typescript
const file = table('file')
  .columns({
    id: string(),
    name: string(),
    ownerId: string(),
    ownerName: string(),
    ownerAvatar: string(),
    thumbnail: string(),
    // Sharing
    shared: boolean(),
    sharedLinkType: string(),
    // Publishing
    published: boolean(),
    lastPublished: number(),
    publishedSlug: string(),
    // Metadata
    createdAt: number(),
    updatedAt: number(),
    isEmpty: boolean(),
    isDeleted: boolean(),
  })
  .primaryKey('id', 'ownerId', 'publishedSlug')
```

### File state table

Tracks per-user interaction with files:

```typescript
const file_state = table('file_state')
  .columns({
    userId: string(),
    fileId: string(),
    firstVisitAt: number().optional(),
    lastEditAt: number().optional(),
    lastSessionState: string().optional(),
    lastVisitAt: number().optional(),
    isFileOwner: boolean().optional(),
    isPinned: boolean().optional(),
  })
  .primaryKey('userId', 'fileId')
```

### Relationships

```typescript
const fileRelationships = relationships(file, ({ one, many }) => ({
  owner: one({
    sourceField: ['ownerId'],
    destField: ['id'],
    destSchema: user,
  }),
  states: many({
    sourceField: ['id'],
    destField: ['fileId'],
    destSchema: file_state,
  }),
}))
```

## Optimistic state management

The `OptimisticAppStore` handles real-time UI updates with optimistic mutations.

### Store architecture

```typescript
class OptimisticAppStore {
  // Committed server state
  private _gold_store = atom('zero store', null as null | ZStoreData)

  // Pending optimistic changes
  private _optimisticStore = atom<Array<{
    updates: ZRowUpdate[]
    mutationId: string
  }>>('optimistic store', [])

  // Combined view (committed + optimistic)
  private store = computed('store', () => {
    const gold = this._gold_store.get()
    if (!gold) return null

    let data = gold
    for (const changes of this._optimisticStore.get()) {
      for (const update of changes.updates) {
        data = this.applyUpdate(data, update)
      }
    }
    return data
  })
}
```

### Optimistic update flow

```typescript
// 1. Apply optimistic update immediately
store.updateOptimisticData(updates, mutationId)

// 2. Send mutation to server
websocket.send({ type: 'mutator', mutationId, name: 'file.update', props })

// 3a. Server confirms - remove from optimistic store
store.commitMutations([mutationId])

// 3b. Server rejects - rollback optimistic change
store.rejectMutation(mutationId)
```

## Permission system

Role-based access control using Zero's permission expressions:

```typescript
const permissions = definePermissions<AuthData, TlaSchema>(schema, () => {
  // Users can only access their own user record
  const allowIfIsUser = (authData, { cmp }) =>
    cmp('id', '=', authData.sub!)

  // File access: owner OR (shared file with file_state record)
  const userCanAccessFile = (authData, { exists, and, cmp, or }) =>
    or(
      cmp('ownerId', '=', authData.sub!),
      and(
        cmp('shared', '=', true),
        exists('states', (q) => q.where('userId', '=', authData.sub!))
      )
    )

  return {
    user: { row: { select: [allowIfIsUser] } },
    file: { row: { select: [userCanAccessFile] } },
    file_state: { row: { select: [allowIfIsUserIdMatches] } },
  }
})
```

## Mutation system

Type-safe database operations with validation:

### User mutations

```typescript
user: {
  insert: async (tx, user: TlaUser) => {
    assert(userId === user.id, ZErrorCode.forbidden)
    await tx.mutate.user.insert(user)
  },
  update: async (tx, user: TlaUserPartial) => {
    assert(userId === user.id, ZErrorCode.forbidden)
    disallowImmutableMutations(user, immutableColumns.user)
    await tx.mutate.user.update(user)
  }
}
```

### File mutations

```typescript
file: {
  insertWithFileState: async (tx, { file, fileState }) => {
    assert(file.ownerId === userId, ZErrorCode.forbidden)
    await assertNotMaxFiles(tx, userId)

    // Validate file ID format
    assert(file.id.match(/^[a-zA-Z0-9_-]+$/), ZErrorCode.bad_request)
    assert(file.id.length >= 16 && file.id.length <= 32, ZErrorCode.bad_request)

    await tx.mutate.file.insert(file)
    await tx.mutate.file_state.upsert(fileState)
  },

  deleteOrForget: async (tx, file: TlaFile) => {
    // Remove user's file state
    await tx.mutate.file_state.delete({ fileId: file.id, userId })

    // If owner, mark file as deleted
    if (file?.ownerId === userId) {
      await tx.mutate.file.update({
        id: file.id,
        ownerId: file.ownerId,
        publishedSlug: file.publishedSlug,
        isDeleted: true
      })
    }
  }
}
```

### Immutable column protection

```typescript
const immutableColumns = {
  user: new Set(['email', 'createdAt', 'updatedAt', 'avatar']),
  file: new Set(['ownerName', 'ownerAvatar', 'createSource', 'updatedAt']),
  file_state: new Set(['firstVisitAt', 'isFileOwner']),
}

function disallowImmutableMutations(data, columns) {
  for (const column of columns) {
    assert(!data[column], ZErrorCode.forbidden)
  }
}
```

## API types

### Room management

```typescript
interface CreateRoomRequestBody {
  origin: string
  snapshot: Snapshot
}

type CreateSnapshotResponseBody =
  | { error: false; roomId: string }
  | { error: true; message: string }
```

### File operations

```typescript
interface CreateFilesRequestBody {
  origin: string
  snapshots: Snapshot[]
}

type CreateFilesResponseBody =
  | { error: false; slugs: string[] }
  | { error: true; message: string }
```

### WebSocket protocol

```typescript
// Server → Client
type ZServerSentPacket =
  | { type: 'initial_data'; initialData: ZStoreData }
  | { type: 'update'; update: ZRowUpdate }
  | { type: 'commit'; mutationIds: string[] }
  | { type: 'reject'; mutationId: string; errorCode: ZErrorCode }

// Client → Server
interface ZClientSentMessage {
  type: 'mutator'
  mutationId: string
  name: string
  props: object
}
```

## Route configuration

URL routing patterns for different room types:

```typescript
const ROOM_OPEN_MODE = {
  READ_ONLY: 'readonly',
  READ_ONLY_LEGACY: 'readonly-legacy',
  READ_WRITE: 'read-write',
}

// URL prefixes
const READ_ONLY_PREFIX = 'ro'     // /ro/abc123
const ROOM_PREFIX = 'r'          // /r/abc123
const SNAPSHOT_PREFIX = 's'      // /s/abc123
const FILE_PREFIX = 'f'          // /f/abc123
const PUBLISH_PREFIX = 'p'       // /p/abc123
```

## Constants and limits

```typescript
const MAX_NUMBER_OF_FILES = 200      // Per-user file limit
const ROOM_SIZE_LIMIT_MB = 25        // Maximum room data size
const Z_PROTOCOL_VERSION = 2         // Current protocol version
const MIN_Z_PROTOCOL_VERSION = 2     // Minimum supported version
```

## Error codes

```typescript
const ZErrorCode = stringEnum(
  'publish_failed',
  'unpublish_failed',
  'republish_failed',
  'unknown_error',
  'client_too_old',
  'forbidden',
  'bad_request',
  'rate_limit_exceeded',
  'max_files_reached'
)
```

## User preferences

Synchronized user settings:

```typescript
const UserPreferencesKeys = [
  'locale',
  'animationSpeed',
  'areKeyboardShortcutsEnabled',
  'edgeScrollSpeed',
  'colorScheme',
  'isSnapMode',
  'isWrapMode',
  'isDynamicSizeMode',
  'isPasteAtCursorMode',
  'enhancedA11yMode',
  'name',
  'color',
] as const
```

## Key files

- packages/dotcom-shared/src/tlaSchema.ts - Database schema definition
- packages/dotcom-shared/src/OptimisticAppStore.ts - Optimistic state management
- packages/dotcom-shared/src/mutators.ts - Mutation definitions
- packages/dotcom-shared/src/types.ts - API type definitions
- packages/dotcom-shared/src/routes.ts - URL routing configuration
- packages/dotcom-shared/src/constants.ts - Application constants

## Related

- [@tldraw/sync](./sync.md) - Sync hooks for multiplayer
- [@tldraw/sync-core](./sync-core.md) - Core sync infrastructure
- [Multiplayer architecture](../architecture/multiplayer.md) - Collaboration design
