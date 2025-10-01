# Dotcom-Shared Package Context

## Overview

The `@tldraw/dotcom-shared` package contains shared code between the tldraw.com web application and its worker services. It provides database schema, optimistic state management, permissions, and API types for the collaborative tldraw platform.

## Architecture

### Database Schema (`tlaSchema.ts`)

Comprehensive data model using Rocicorp Zero for real-time collaboration:

#### Core Tables

```typescript
// User Management
const user = table('user')
	.columns({
		id: string(),
		name: string(),
		email: string(),
		avatar: string(),
		color: string(),
		exportFormat: string(),
		exportTheme: string(),
		exportBackground: boolean(),
		exportPadding: boolean(),
		createdAt: number(),
		updatedAt: number(),
		flags: string(),
		// User preferences (optional)
		locale: string().optional(),
		animationSpeed: number().optional(),
		areKeyboardShortcutsEnabled: boolean().optional(),
		edgeScrollSpeed: number().optional(),
		colorScheme: string().optional(),
		isSnapMode: boolean().optional(),
		isWrapMode: boolean().optional(),
		isDynamicSizeMode: boolean().optional(),
		isPasteAtCursorMode: boolean().optional(),
		enhancedA11yMode: boolean().optional(),
		allowAnalyticsCookie: boolean().optional(),
	})
	.primaryKey('id')

// File Management
const file = table('file')
	.columns({
		id: string(),
		name: string(),
		ownerId: string(),
		ownerName: string(),
		ownerAvatar: string(),
		thumbnail: string(),
		shared: boolean(),
		sharedLinkType: string(),
		published: boolean(),
		lastPublished: number(),
		publishedSlug: string(),
		createdAt: number(),
		updatedAt: number(),
		isEmpty: boolean(),
		isDeleted: boolean(),
		createSource: string().optional(),
	})
	.primaryKey('id', 'ownerId', 'publishedSlug')

// User-File Relationship State
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

#### Relationships

Type-safe relational queries between tables:

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

const fileStateRelationships = relationships(file_state, ({ one }) => ({
	file: one({
		sourceField: ['fileId'],
		destField: ['id'],
		destSchema: file,
	}),
	user: one({
		sourceField: ['userId'],
		destField: ['id'],
		destSchema: user,
	}),
}))
```

### Optimistic State Management (`OptimisticAppStore.ts`)

Real-time UI updates with optimistic mutations:

#### Store Architecture

```typescript
class OptimisticAppStore {
	private _gold_store = atom('zero store', null as null | ZStoreData, { isEqual })
	private _optimisticStore = atom<
		Array<{
			updates: ZRowUpdate[]
			mutationId: string
		}>
	>('optimistic store', [])

	// Computed store combining committed + optimistic changes
	private store = computed('store', () => {
		const gold = this._gold_store.get()
		if (!gold) return null

		let data = gold
		const optimistic = this._optimisticStore.get()
		for (const changes of optimistic) {
			for (const update of changes.updates) {
				data = this.applyUpdate(data, update)
			}
		}
		return data
	})
}
```

#### Optimistic Update Flow

```typescript
// 1. Apply optimistic update immediately for instant UI
updateOptimisticData(updates: ZRowUpdate[], mutationId: string) {
  this._optimisticStore.update(prev => [...prev, { updates, mutationId }])
}

// 2. Server confirms - remove from optimistic store
commitMutations(mutationIds: string[]) {
  this._optimisticStore.update(prev => {
    const highestIndex = prev.findLastIndex(p => mutationIds.includes(p.mutationId))
    return prev.slice(highestIndex + 1)
  })
}

// 3. Server rejects - rollback optimistic changes
rejectMutation(mutationId: string) {
  this._optimisticStore.update(prev =>
    prev.filter(p => p.mutationId !== mutationId)
  )
}
```

#### Data Synchronization

```typescript
// Apply database updates (insert/update/delete)
applyUpdate(prev: ZStoreData, update: ZRowUpdate): ZStoreData {
  const { row, table, event } = update
  const tableSchema = schema.tables[table]
  const rows = prev[table]

  const matchExisting = (existing: any) =>
    tableSchema.primaryKey.every(key => existing[key] === row[key])

  switch (event) {
    case 'insert':
      return { ...prev, [table]: [...rows, row] }
    case 'update':
      return {
        ...prev,
        [table]: rows.map(existing =>
          matchExisting(existing) ? { ...existing, ...row } : existing
        )
      }
    case 'delete':
      return {
        ...prev,
        [table]: rows.filter(existing => !matchExisting(existing))
      }
  }
}
```

### Permission System

Role-based access control for collaborative features:

#### User Permissions

```typescript
const permissions = definePermissions<AuthData, TlaSchema>(schema, () => {
	// Users can only access their own user record
	const allowIfIsUser = (authData: AuthData, { cmp }) => cmp('id', '=', authData.sub!)

	// Users can only access their own file states
	const allowIfIsUserIdMatches = (authData: AuthData, { cmp }) => cmp('userId', '=', authData.sub!)

	// File access: owner OR shared file with file_state record
	const userCanAccessFile = (authData: AuthData, { exists, and, cmp, or }) =>
		or(
			cmp('ownerId', '=', authData.sub!), // File owner
			and(
				cmp('shared', '=', true), // File is shared
				exists('states', (q) => q.where('userId', '=', authData.sub!)) // User has state
			)
		)

	return {
		user: { row: { select: [allowIfIsUser] } },
		file: { row: { select: [userCanAccessFile] } },
		file_state: { row: { select: [allowIfIsUserIdMatches] } },
	}
})
```

### Mutation System (`mutators.ts`)

Type-safe database operations with validation:

#### User Mutations

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

#### File Mutations

```typescript
file: {
  insertWithFileState: async (tx, { file, fileState }) => {
    assert(file.ownerId === userId, ZErrorCode.forbidden)
    await assertNotMaxFiles(tx, userId)

    // File ID validation
    assert(file.id.match(/^[a-zA-Z0-9_-]+$/), ZErrorCode.bad_request)
    assert(file.id.length <= 32, ZErrorCode.bad_request)
    assert(file.id.length >= 16, ZErrorCode.bad_request)

    await tx.mutate.file.insert(file)
    await tx.mutate.file_state.upsert(fileState)
  },

  deleteOrForget: async (tx, file: TlaFile) => {
    // Remove user's file state
    await tx.mutate.file_state.delete({ fileId: file.id, userId })

    // If owner, mark as deleted (cascade delete other file states)
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

#### Data Protection

```typescript
// Prevent modification of immutable columns
const immutableColumns = {
	user: new Set(['email', 'createdAt', 'updatedAt', 'avatar']),
	file: new Set(['ownerName', 'ownerAvatar', 'createSource', 'updatedAt', 'createdAt']),
	file_state: new Set(['firstVisitAt', 'isFileOwner']),
}

function disallowImmutableMutations(data, immutableColumns) {
	for (const immutableColumn of immutableColumns) {
		assert(!data[immutableColumn], ZErrorCode.forbidden)
	}
}
```

### API Types (`types.ts`)

Comprehensive type definitions for client-server communication:

#### Room Management

```typescript
interface CreateRoomRequestBody {
	origin: string
	snapshot: Snapshot
}

interface CreateSnapshotRequestBody {
	schema: SerializedSchema
	snapshot: SerializedStore<TLRecord>
	parent_slug?: string
}

type CreateSnapshotResponseBody =
	| { error: false; roomId: string }
	| { error: true; message: string }
```

#### File Operations

```typescript
interface CreateFilesRequestBody {
	origin: string
	snapshots: Snapshot[]
}

type CreateFilesResponseBody = { error: false; slugs: string[] } | { error: true; message: string }

type PublishFileResponseBody = { error: false } | { error: true; message: string }
```

#### Real-Time Communication

```typescript
// Server to Client
type ZServerSentPacket =
	| { type: 'initial_data'; initialData: ZStoreData }
	| { type: 'update'; update: ZRowUpdate }
	| { type: 'commit'; mutationIds: string[] }
	| { type: 'reject'; mutationId: string; errorCode: ZErrorCode }

// Client to Server
interface ZClientSentMessage {
	type: 'mutator'
	mutationId: string
	name: string
	props: object
}
```

### Configuration and Constants

#### Room Management (`routes.ts`)

URL routing patterns for different room types:

```typescript
const ROOM_OPEN_MODE = {
	READ_ONLY: 'readonly',
	READ_ONLY_LEGACY: 'readonly-legacy',
	READ_WRITE: 'read-write',
}

// URL prefixes for different room types
const READ_ONLY_PREFIX = 'ro' // /ro/abc123
const READ_ONLY_LEGACY_PREFIX = 'v' // /v/abc123
const ROOM_PREFIX = 'r' // /r/abc123
const SNAPSHOT_PREFIX = 's' // /s/abc123
const FILE_PREFIX = 'f' // /f/abc123
const PUBLISH_PREFIX = 'p' // /p/abc123

const RoomOpenModeToPath = {
	[ROOM_OPEN_MODE.READ_ONLY]: READ_ONLY_PREFIX,
	[ROOM_OPEN_MODE.READ_ONLY_LEGACY]: READ_ONLY_LEGACY_PREFIX,
	[ROOM_OPEN_MODE.READ_WRITE]: ROOM_PREFIX,
}
```

#### Application Limits (`constants.ts`)

```typescript
const MAX_NUMBER_OF_FILES = 200 // Per-user file limit
const ROOM_SIZE_LIMIT_MB = 25 // Room data size limit
```

### Error Handling

#### Error Code System

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

#### Validation and Assertions

```typescript
// File limit enforcement
async function assertNotMaxFiles(tx: Transaction, userId: string) {
	const count = (await tx.query.file.where('ownerId', '=', userId).run()).filter(
		(f) => !f.isDeleted
	).length
	assert(count < MAX_NUMBER_OF_FILES, ZErrorCode.max_files_reached)
}

// File ID validation
assert(file.id.match(/^[a-zA-Z0-9_-]+$/), ZErrorCode.bad_request)
assert(file.id.length <= 32, ZErrorCode.bad_request)
assert(file.id.length >= 16, ZErrorCode.bad_request)
```

## Key Features

### Real-Time Collaboration

**Optimistic Updates**: Immediate UI response while server processes changes
**Conflict Resolution**: Automatic handling of concurrent modifications
**Live Sync**: Real-time data synchronization across multiple clients

### File Management

**Ownership Model**: Clear file ownership with sharing capabilities
**Access Control**: Permission-based file access for collaboration
**State Tracking**: Per-user file interaction history and preferences

### User Experience

**Preferences Sync**: User settings synchronized across devices
**Export Options**: Customizable export formats and themes
**Session State**: Restore user's last position and tool selection

### Security

**Authentication**: JWT-based user authentication
**Authorization**: Row-level security with permission expressions
**Data Isolation**: Users can only access permitted data

## Data Flow Patterns

### Mutation Flow

```typescript
// 1. Client initiates mutation
const mutationId = generateId()
await appStore.updateOptimisticData(updates, mutationId)

// 2. Send to server
websocket.send({
	type: 'mutator',
	mutationId,
	name: 'file.update',
	props: { name: 'New File Name' },
})

// 3. Server response
// Success: { type: 'commit', mutationIds: [mutationId] }
// Failure: { type: 'reject', mutationId, errorCode: 'forbidden' }
```

### File Sharing

```typescript
// Owner shares file
await mutators.file.update({
	id: fileId,
	shared: true,
	sharedLinkType: 'edit', // or 'view'
})

// Collaborator joins
await mutators.file_state.insert({
	userId: currentUserId,
	fileId: sharedFileId,
	firstVisitAt: Date.now(),
})
```

### Permission Enforcement

```typescript
// File access check
const userCanAccessFile = (authData, { exists, and, cmp, or }) =>
	or(
		cmp('ownerId', '=', authData.sub!), // User owns file
		and(
			cmp('shared', '=', true), // File is shared
			exists('states', (q) => q.where('userId', '=', authData.sub!)) // User has state
		)
	)
```

## Protocol Communication

### WebSocket Protocol

Bi-directional communication for real-time collaboration:

#### Server Messages

```typescript
// Initial data load
{ type: 'initial_data', initialData: ZStoreData }

// Live updates
{ type: 'update', update: ZRowUpdate }

// Mutation confirmations
{ type: 'commit', mutationIds: string[] }

// Mutation rejections
{ type: 'reject', mutationId: string, errorCode: ZErrorCode }
```

#### Client Messages

```typescript
// Mutation requests
{
  type: 'mutator',
  mutationId: string,
  name: 'file.update' | 'user.update' | 'file_state.insert',
  props: object
}
```

### Version Management

```typescript
// Protocol versioning for backwards compatibility
const Z_PROTOCOL_VERSION = 2
const MIN_Z_PROTOCOL_VERSION = 2

// Forces client reload on breaking changes
if (clientVersion < MIN_Z_PROTOCOL_VERSION) {
	throw new Error(ZErrorCode.client_too_old)
}
```

## User Preferences System

### Preferences Schema

Comprehensive user customization options:

```typescript
const UserPreferencesKeys = [
	'locale', // Language/region
	'animationSpeed', // UI animation timing
	'areKeyboardShortcutsEnabled', // Keyboard shortcuts toggle
	'edgeScrollSpeed', // Canvas edge scrolling
	'colorScheme', // Light/dark theme
	'isSnapMode', // Shape snapping
	'isWrapMode', // Text wrapping
	'isDynamicSizeMode', // Dynamic shape sizing
	'isPasteAtCursorMode', // Paste behavior
	'enhancedA11yMode', // Enhanced a11y mode
	'name', // Display name
	'color', // User color for collaboration
] as const satisfies Array<keyof TlaUser>
```

### Export Configuration

```typescript
interface TlaUser {
	exportFormat: string // 'svg' | 'png' | 'jpeg' | 'webp'
	exportTheme: string // 'light' | 'dark' | 'auto'
	exportBackground: boolean // Include background
	exportPadding: boolean // Add padding around content
}
```

## File Lifecycle

### File Creation

```typescript
// Create file with initial state
await mutators.file.insertWithFileState({
	file: {
		id: generateFileId(),
		name: 'Untitled',
		ownerId: userId,
		shared: false,
		published: false,
		isEmpty: true,
		isDeleted: false,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	},
	fileState: {
		userId,
		fileId,
		firstVisitAt: Date.now(),
		isFileOwner: true,
	},
})
```

### File Deletion

```typescript
// Soft delete preserving history
await mutators.file.deleteOrForget(file)

// If owner: marks file as deleted, cascades to all file_states
// If collaborator: removes only user's file_state
```

### Publishing System

```typescript
// Publish for public access
await mutators.file.update({
	id: fileId,
	published: true,
	publishedSlug: generateSlug(),
	lastPublished: Date.now(),
})
```

## Feedback System

### User Feedback Collection

```typescript
interface SubmitFeedbackRequestBody {
	description: string // User's feedback/bug report
	allowContact: boolean // Permission to follow up
	url: string // Page where feedback originated
}

const MAX_PROBLEM_DESCRIPTION_LENGTH = 2000
```

## License Management

### License Key System

```typescript
// License validation for pro features
export default function getLicenseKey(): string | null {
	// Returns license key for premium features
	// Used by both client and worker for feature gating
}
```

## Key Benefits

### Developer Experience

- **Type Safety**: Full TypeScript definitions for all operations
- **Real-Time**: Optimistic updates for instant UI feedback
- **Scalable**: Designed for thousands of concurrent users
- **Reliable**: Automatic conflict resolution and error recovery

### User Experience

- **Instant Updates**: Changes appear immediately while syncing
- **Offline Resilience**: Optimistic updates work during network issues
- **Collaborative**: Multiple users can edit simultaneously
- **Persistent**: All changes automatically saved and synchronized

### Architecture

- **Shared Logic**: Common code between client and server
- **Event Driven**: WebSocket-based real-time communication
- **Permission Controlled**: Secure access to user and file data
- **Version Managed**: Protocol versioning for smooth updates

### Maintenance

- **Schema Evolution**: Zero-downtime database migrations
- **Error Tracking**: Comprehensive error codes and logging
- **Performance**: Optimized queries and efficient data structures
- **Testing**: Comprehensive test coverage for critical paths
