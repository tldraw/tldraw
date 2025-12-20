---
title: '@tldraw/store'
created_at: 12/17/2024
updated_at: 12/20/2024
keywords:
  - store
  - reactive
  - database
  - records
  - state
  - validation
  - migrations
---

## Overview

`@tldraw/store` is a reactive record storage library that provides a type-safe, event-driven database for managing collections of records. It combines reactive primitives from `@tldraw/state` with validation, migrations, side effects, and history tracking.

The store serves as tldraw's foundational data layer. It manages all document state including shapes, pages, assets, and user preferences. Every record is stored reactively, enabling automatic UI updates when data changes. The store handles record validation, schema evolution through migrations, and change tracking while maintaining excellent performance and type safety.

## Architecture

### Core components

The store architecture consists of several interconnected systems that work together to provide a complete data management solution.

**Store class**: The `Store` class manages record storage, change history, validation, side effects, and query capabilities. It uses an `AtomMap` to store records reactively, ensuring that accessing a record automatically tracks dependencies for reactive updates.

**Record system**: Records are the fundamental unit of data in the store. Every record extends `BaseRecord`, which provides an `id` and `typeName` property. The `RecordType` class serves as a factory for creating typed records with validation, default properties, and ID generation. Records are immutable - updates create new record instances rather than modifying existing ones.

**Schema and validation**: The `StoreSchema` manages the collection of record types, coordinates migrations across different record types, and provides validation for record integrity. Each record type includes a validator that ensures data consistency before records are stored.

**Reactive storage**: The store uses `AtomMap`, a reactive replacement for JavaScript's `Map` that stores each record in its own atom. This enables fine-grained reactivity where components can depend on specific records without re-rendering when unrelated records change. The `AtomMap` provides both reactive and non-reactive access patterns for performance-critical code paths.

**Query system**: `StoreQueries` provides reactive indexes and query capabilities. Indexes are automatically maintained as records change, and queries return reactive computed values that update incrementally. This makes it efficient to query large collections without manually tracking dependencies.

**Change tracking**: Every change to the store generates a `RecordsDiff` that describes what was added, updated, and removed. The history system accumulates changes and uses throttling to batch updates efficiently. This change tracking enables undo/redo functionality, synchronization with remote stores, and debugging tools.

**Side effects**: `StoreSideEffects` provides lifecycle hooks that run before and after record operations. These hooks enable business logic like maintaining referential integrity, updating derived data, or preventing invalid operations. Side effects run within transactions, ensuring consistent state even when multiple records are affected.

**Migration system**: The migration system handles schema evolution over time. Migrations transform old data formats to new ones, with support for version tracking, dependency ordering, and validation. Both forward and backward migrations are supported, enabling rollback when needed.

## Key concepts

### Record scopes

Records in the store have different scopes that determine their persistence and synchronization behavior.

The `document` scope is for persistent data that is saved and synchronized across all instances. This includes shapes, pages, and other core document content. Document-scoped records are both saved to persistent storage and synchronized when multiple users collaborate on the same document.

The `session` scope is for per-instance data that may be persisted locally but is not synchronized across instances. User preferences, UI state, and temporary settings typically use session scope. These records are preserved when the user closes and reopens the application, but each user or browser tab maintains its own copy.

The `presence` scope is for ephemeral data that is synchronized but not persisted. Presence information like cursor positions, selections, and user status uses this scope. These records are shared in real-time during collaboration but disappear when the user disconnects.

### Reactivity and change propagation

The store's reactivity system ensures that components automatically update when the data they depend on changes. This happens transparently through reactive primitives from `@tldraw/state`.

When you access a record from the store within a reactive context like a computed signal or React component, the store tracks that your code depends on that specific record. When the record changes, all dependent computations are automatically invalidated and re-run. This dependency tracking happens at the individual record level, so updating one record only affects code that depends on that particular record.

The change propagation system batches updates efficiently. Changes are accumulated in a `HistoryAccumulator` and flushed to listeners using `throttleToNextFrame`. This prevents excessive listener calls when many records change in rapid succession, such as during drag operations or undo/redo actions.

### Queries and indexes

The store provides reactive indexes that make it efficient to query records by property values. When you create an index on a property, the store maintains a map from property values to sets of record IDs that have those values. These indexes update incrementally as records change.

Queries can combine multiple conditions using query expressions. The query engine evaluates these expressions efficiently using the available indexes and returns reactive computed values. When records are added, updated, or removed, the query results update automatically without re-evaluating the entire query.

For frequently accessed queries, you can use the `createComputedCache` utility to cache query results. The cache automatically invalidates entries when the relevant records change, providing fast access to derived data while maintaining correctness.

### Validation and type safety

Every record type includes a validator that ensures records meet the expected schema before they are stored. Validation happens automatically during `put`, `update`, and other modification operations. If validation fails, the operation is rejected and the store remains unchanged.

The validation system supports multiple strategies. During normal operation, the store uses full validation to catch errors. For records loaded from a known-good source like the current application version, the store can use optimized validation that skips expensive checks. This improves performance when loading large documents.

Type safety is maintained throughout the store using TypeScript's type system. The `Store` is generic over the union of all record types it contains, enabling full type inference for operations like `get`, `put`, and `update`. The type system prevents errors like trying to store a record with the wrong type name or accessing properties that don't exist.

### Side effects and business logic

Side effects provide hooks where you can insert business logic that runs when records change. These hooks are critical for maintaining data consistency and enforcing rules that span multiple records.

Before handlers run before a record is created, updated, or deleted. They can modify the record before it's stored, or return `false` to prevent the operation entirely. This is useful for validation that depends on other records, or for automatically updating related data.

After handlers run after a record has been successfully modified. They can trigger additional updates, maintain indexes, or perform side effects like logging or analytics. After handlers receive information about what changed, enabling efficient incremental updates.

Operation complete handlers run after all side effects have finished processing. These are useful for operations that should happen once per transaction, such as saving to persistent storage or sending updates over the network.

### Migrations and schema evolution

As your application evolves, you need to change the structure of your records. The migration system handles this by defining transformations between different versions of your data.

Migrations are organized into sequences that track the version history of each record type. Each migration has an ID, an up function that transforms old data to new data, and optionally a down function for rollback. The migration system automatically determines which migrations need to run based on the version of the data being loaded.

When loading persisted data, the store reads the schema version and applies all necessary migrations in order. This happens transparently - your application code always works with the current version of the data. The migration system handles dependency ordering, so if one record type references another, the migrations run in the correct order.

## API patterns

### Creating a store

To create a store, first define your record types with validators and scopes, then create a schema that combines all your record types and their migrations.

```typescript
import { createRecordType, Store, StoreSchema } from '@tldraw/store'

interface Todo extends BaseRecord<'todo'> {
	title: string
	completed: boolean
}

const Todo = createRecordType<Todo>('todo', {
	validator: todoValidator,
	scope: 'document',
}).withDefaultProperties(() => ({
	completed: false,
}))

const schema = StoreSchema.create({
	todo: Todo,
})

const store = new Store({ schema })
```

### Basic CRUD operations

The store provides methods for creating, reading, updating, and deleting records. All operations are type-safe and automatically validated.

```typescript
// Create records
const todo = Todo.create({
	id: Todo.createId('1'),
	title: 'Ship v3',
})
store.put([todo])

// Read records
const retrieved = store.get(todo.id)

// Update records
store.update(todo.id, (t) => ({ ...t, completed: true }))

// Delete records
store.remove([todo.id])
```

### Reactive queries

Use the query system to build reactive indexes and derived data that updates automatically when records change.

```typescript
// Create an index by property
const todosByCompletion = store.query.index('todo', 'completed')

// Use the index in a computed signal
const completedTodos = computed('completed', () => {
	const index = todosByCompletion.get()
	return index.get(true) ?? new Set()
})

// The computed value updates automatically when todos change
```

### Registering side effects

Side effects enable business logic that runs when records change. Register handlers for specific record types to maintain data consistency.

```typescript
// After create handler
store.sideEffects.registerAfterCreateHandler('todo', (todo) => {
	console.log(`Created: ${todo.title}`)
})

// Before delete handler
store.sideEffects.registerBeforeDeleteHandler('todo', (todo) => {
	if (todo.completed) {
		return false // Prevent deletion of completed todos
	}
})
```

### Defining migrations

Migrations transform old data formats to new ones as your schema evolves. Define migration sequences with up and down functions.

```typescript
import { createMigrationSequence } from '@tldraw/store'

const todoMigrations = createMigrationSequence({
	sequenceId: 'com.example.todo',
	sequence: [
		{
			id: 'com.example.todo/add-priority',
			up: (record: any) => {
				record.priority = 'medium'
				return record
			},
		},
	],
})

const schema = StoreSchema.create({ todo: Todo }, { migrations: [todoMigrations] })
```

## Key files

- packages/store/src/lib/Store.ts - Main store class and core operations
- packages/store/src/lib/AtomMap.ts - Reactive map implementation
- packages/store/src/lib/RecordType.ts - Record factory and type system
- packages/store/src/lib/StoreSchema.ts - Schema management and validation
- packages/store/src/lib/StoreQueries.ts - Reactive indexing and query system
- packages/store/src/lib/StoreSideEffects.ts - Lifecycle hooks and side effects
- packages/store/src/lib/migrate.ts - Migration system and version management
- packages/store/src/lib/RecordsDiff.ts - Change tracking and diff operations
- packages/store/src/lib/BaseRecord.ts - Base record interface and types

## Related

- [@tldraw/state](./state.md) - Reactive primitives underlying the store
- [Store and records](../architecture/store-records.md) - Architectural overview of the store system
