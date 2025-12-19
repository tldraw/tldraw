---
title: Store and records
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - store
  - records
  - database
  - persistence
  - queries
---

## Overview

The Store (in `@tldraw/store`) is tldraw's client-side database for document data. A record is a typed object with an `id` and `typeName` stored in the Store; record types are defined in `@tldraw/tlschema`. The Store provides reactive queries, atomic transactions, change history, and persistence that power the editor's state.

It is responsible for:

- Holding document, session, and presence records
- Validating writes against record type validators
- Emitting change events for undo/redo and sync
- Serializing snapshots for persistence

## Key components

### Store

The Store holds the current set of records and exposes an API for reading and writing them. It tracks changes as transactions and provides change events that downstream systems (history, sync, UI) can subscribe to.

### Records and record types

Every record shares a small base shape; record types extend this with their own properties and validators:

```typescript
import { createRecordType } from '@tldraw/store'

interface BaseRecord {
	id: string // Unique identifier with prefix
	typeName: string // Record type name
}

const TodoRecord = createRecordType<Todo>('todo', {
	validator: todoValidator,
	scope: 'document',
})

const todo = TodoRecord.create({
	id: TodoRecord.createId('1'),
	title: 'Ship',
	completed: false,
})
```

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

IDs are branded strings with prefixes like `shape:` or `page:`. Use the helper functions in `@tldraw/tlschema` to create them and keep types consistent.

### Schema and validation

The Store uses a schema to define record types, validators, and migrations. Every write is validated against the record type's validator, and persisted snapshots include schema versions so migrations can run on load and sync. See [Migrations](./migrations.md) for how schema versions evolve.

## Data flow

### Operations and transactions

Writes happen through `put`, `update`, and `remove`. The Store groups writes into transactions, which drives the undo/redo history. Use atomic blocks to combine multiple writes into a single history entry, and merge remote changes without adding to history.

```typescript
store.put([todo])

store.update(shapeId, (shape) => ({
	...shape,
	x: shape.x + 10,
}))

store.atomic(() => {
	store.put([newShape])
	store.remove([oldShapeId])
})
```

### Reactive queries

The Store emits change events that can be observed to keep derived data in sync:

```typescript
store.listen((change) => {
	if (change.changes.updated[shapeId]) {
		console.log('Shape updated:', change.changes.updated[shapeId])
	}
})
```

For derived data, use computed signals from the reactive state system. See [Reactive state](./reactive-state.md) for the signal model.

### Change tracking and history

Each change event includes a `source` (`user`, `remote`, or `system`) and a set of `added`, `updated`, and `removed` records. The history system uses this metadata to decide what should be undoable and what should be ignored (for example, remote changes).

### Scopes

Records belong to scopes that control visibility and persistence:

| Scope      | Purpose                 | Example                 |
| ---------- | ----------------------- | ----------------------- |
| `document` | Shared across all users | Shapes, pages, bindings |
| `session`  | Per-user session state  | Camera, selection       |
| `presence` | Real-time user state    | Cursors, user info      |

You can filter listeners by scope (for example, `store.listen(handler, { scope: 'document' })`).

### Persistence and migrations

Snapshots serialize records by scope and include schema versions. When a snapshot or record crosses a version boundary, the schema migrates it to the current version using the migration system.

```typescript
const snapshot = store.serialize({ scope: 'document' })
const migrated = store.schema.migrateSnapshot(snapshot)

store.deserialize(migrated)
```

## Extension points

You can extend the Store by:

- Defining custom record types with validators
- Adding migrations as record types evolve
- Building derived data with computed signals or indices
- Subclassing the Store to expose convenience methods

See [@tldraw/store](../packages/store.md) for the extension APIs.

## Usage with the Editor

The Editor wraps the Store with higher-level APIs for shapes, input, and rendering. Prefer Editor methods for user-facing changes, but remember the Store remains the source of truth for persisted data.

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
