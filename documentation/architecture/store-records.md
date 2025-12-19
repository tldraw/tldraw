---
title: Store and records
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - store
  - records
  - database
  - persistence
  - queries
---

The Store is tldraw's client-side database for managing document records. It provides reactive queries, atomic transactions, change history, and persistence capabilities that power the editor's state management.

## Overview

The `@tldraw/store` package implements a reactive, type-safe store that:

- Holds all document records (shapes, pages, bindings, etc.)
- Provides reactive queries that update automatically
- Tracks change history for undo/redo
- Supports atomic transactions
- Integrates with persistence and sync systems

## Record types

### Base record structure

All records share a common base:

```typescript
interface BaseRecord {
	id: string // Unique identifier with prefix
	typeName: string // Record type name
}
```

### Core record types

tldraw uses several record types defined in `@tldraw/tlschema`:

| Type         | Purpose               | ID Prefix   |
| ------------ | --------------------- | ----------- |
| `TLShape`    | Shape data            | `shape:`    |
| `TLPage`     | Page container        | `page:`     |
| `TLBinding`  | Shape relationships   | `binding:`  |
| `TLAsset`    | External resources    | `asset:`    |
| `TLCamera`   | Viewport state        | `camera:`   |
| `TLDocument` | Document metadata     | `document:` |
| `TLInstance` | Editor instance state | `instance:` |
| `TLPointer`  | Pointer state         | `pointer:`  |
| `TLPresence` | User presence         | `presence:` |

### ID types

IDs are branded strings for type safety:

```typescript
import { createShapeId } from '@tldraw/tlschema'

const shapeId = createShapeId('abc') // 'shape:abc'

// Type-safe lookup
const shape = store.get(shapeId) // Type: TLShape | undefined
```

## Store operations

### Creating records

```typescript
import { RecordId, createRecordType } from '@tldraw/store'

// Define a record type
const TodoRecord = createRecordType<Todo>('todo', {
	validator: todoValidator,
	scope: 'document',
})

// Add to store
store.put([
	TodoRecord.create({
		id: TodoRecord.createId('1'),
		title: 'Learn tldraw',
		completed: false,
	}),
])
```

### Reading records

```typescript
// Get by ID
const shape = store.get(shapeId)

// Check existence
store.has(shapeId) // boolean

// Get all of a type
const shapes = store.allRecords().filter((r) => r.typeName === 'shape')
```

### Updating records

```typescript
// Full replacement
store.put([{ ...shape, x: 100 }])

// Partial update
store.update(shapeId, (shape) => ({
	...shape,
	props: { ...shape.props, color: 'red' },
}))
```

### Deleting records

```typescript
// Single delete
store.remove([shapeId])

// Batch delete
store.remove([shape1Id, shape2Id, shape3Id])
```

## Reactive queries

The Store provides reactive queries that automatically update when relevant data changes.

### Basic queries

```typescript
// Listen to specific record
const dispose = store.listen((change) => {
	if (change.changes.updated[shapeId]) {
		console.log('Shape updated:', change.changes.updated[shapeId])
	}
})

// Listen to all changes
store.listen((change) => {
	console.log('Added:', Object.keys(change.changes.added))
	console.log('Updated:', Object.keys(change.changes.updated))
	console.log('Removed:', Object.keys(change.changes.removed))
})
```

### Computed queries

Use signals for reactive derived data:

```typescript
import { computed } from '@tldraw/state'

const selectedShapes = computed('selectedShapes', () => {
	const ids = editor.getSelectedShapeIds()
	return ids.map((id) => store.get(id)).filter(Boolean)
})
```

### History queries

```typescript
// Get recent changes
const epoch = getGlobalEpoch()
// ... time passes, changes made ...
const history = store.extractingChanges(() => {
	return store.serialize()
})
```

## Transactions

### Atomic operations

```typescript
store.atomic(() => {
	store.put([newShape])
	store.update(existingShapeId, (s) => ({ ...s, x: s.x + 10 }))
	store.remove([oldShapeId])
})
// All changes applied atomically, history records single entry
```

### Mark and squash

```typescript
// Mark starting point
const mark = store.mark('operation-start')

// Make multiple changes
store.put([shape1])
store.put([shape2])
store.update(shape3, ...)

// Squash all changes since mark into single history entry
store.squashToMark(mark)
```

### Merge remote changes

For sync, apply remote changes without triggering undo:

```typescript
store.mergeRemoteChanges(() => {
	store.put([remoteShape])
	store.remove([deletedShapeId])
})
```

## Change tracking

### Store listener

```typescript
interface StoreChange<R extends BaseRecord> {
	source: 'user' | 'remote' | 'system'
	changes: {
		added: { [id: string]: R }
		updated: { [id: string]: [before: R, after: R] }
		removed: { [id: string]: R }
	}
}

store.listen(
	(change) => {
		switch (change.source) {
			case 'user':
				// User action, add to undo stack
				break
			case 'remote':
				// From sync, don't add to undo
				break
			case 'system':
				// Internal update
				break
		}
	},
	{ source: 'all' }
)
```

### History events

```typescript
store.listen(
	(change) => {
		for (const [id, record] of Object.entries(change.changes.added)) {
			analytics.track('record_created', { type: record.typeName })
		}
	},
	{ source: 'user', scope: 'document' }
)
```

## Scopes

Records belong to different scopes:

| Scope      | Purpose                 | Example                 |
| ---------- | ----------------------- | ----------------------- |
| `document` | Shared across all users | Shapes, pages, bindings |
| `session`  | Per-user session state  | Camera, selection       |
| `presence` | Real-time user state    | Cursors, user info      |

```typescript
// Only listen to document changes
store.listen(handler, { scope: 'document' })

// Only listen to session changes
store.listen(handler, { scope: 'session' })
```

## Persistence

### Serialization

```typescript
// Serialize entire store
const snapshot = store.serialize()

// Serialize specific scope
const documentSnapshot = store.serialize({ scope: 'document' })

// JSON-safe output
JSON.stringify(snapshot)
```

### Deserialization

```typescript
// Load into empty store
store.deserialize(snapshot)

// Merge into existing store
store.deserializeAndMerge(snapshot)
```

### Schema compatibility

```typescript
import { createTLStore, defaultShapeSchemas } from '@tldraw/tldraw'

const store = createTLStore({
	shapeUtils: [...defaultShapeSchemas],
})

// Check schema version
store.schema.schemaVersion // number

// Migrate old snapshots
const migrated = store.schema.migrateSnapshot(oldSnapshot)
```

## Schema and validation

### Record type definitions

```typescript
import { createRecordType, T } from '@tldraw/store'

const TaskRecord = createRecordType<Task>('task', {
	validator: T.object({
		id: T.string,
		typeName: T.literal('task'),
		title: T.string,
		completed: T.boolean,
		dueDate: T.number.nullable(),
	}),
	scope: 'document',
})
```

### Validation on write

```typescript
// Throws ValidationError if invalid
store.put([invalidRecord])

// Check validity
try {
	TaskRecord.validator.validate(data)
} catch (e) {
	console.error('Invalid task:', e.message)
}
```

## Derived data

### Store-level computed

```typescript
class MyStore extends Store<MyRecords> {
	@computed getActiveTasks() {
		return this.allRecords()
			.filter((r): r is Task => r.typeName === 'task')
			.filter((t) => !t.completed)
	}

	@computed getTasksByDueDate() {
		return this.getActiveTasks().sort((a, b) => (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity))
	}
}
```

### Index utilities

```typescript
// Create lookup index
const shapesByPage = new Map<string, Set<string>>()

store.listen((change) => {
	for (const [id, shape] of Object.entries(change.changes.added)) {
		if (shape.typeName === 'shape') {
			const pageShapes = shapesByPage.get(shape.parentId) ?? new Set()
			pageShapes.add(id)
			shapesByPage.set(shape.parentId, pageShapes)
		}
	}
	// Handle updates and removals...
})
```

## Usage with Editor

The Editor wraps the Store with higher-level methods:

```typescript
// Editor provides typed methods
editor.createShape({
	type: 'geo',
	x: 100,
	y: 100,
	props: { geo: 'rectangle', w: 200, h: 100 },
})

// Under the hood
store.put([
	ShapeRecord.create({
		id: createShapeId(),
		type: 'geo',
		x: 100,
		y: 100,
		parentId: currentPageId,
		index: getNextIndex(),
		props: { geo: 'rectangle', w: 200, h: 100 },
	}),
])
```

## Key files

- packages/store/src/lib/Store.ts - Core store implementation
- packages/store/src/lib/RecordType.ts - Record type definitions
- packages/store/src/lib/StoreSchema.ts - Schema and migrations
- packages/tlschema/src/records/ - tldraw record definitions
- packages/tlschema/src/createTLSchema.ts - Schema creation

## Related

- [@tldraw/store](../packages/store.md) - Store package details
- [@tldraw/tlschema](../packages/tlschema.md) - Record type definitions
- [Reactive state](./reactive-state.md) - Signal system the store uses
- [Migrations](./migrations.md) - Schema migration system
