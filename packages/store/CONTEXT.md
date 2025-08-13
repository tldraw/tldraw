# CONTEXT.md - @tldraw/store Package

This file provides comprehensive context for understanding the `@tldraw/store` package, a reactive record storage system built on `@tldraw/state`.

## Package Overview

`@tldraw/store` is a reactive record storage library that provides a type-safe, event-driven database for managing collections of records. It combines the reactive primitives from `@tldraw/state` with a robust record management system, including validation, migrations, side effects, and history tracking.

**Core Philosophy:** Manage collections of typed records with automatic reactivity, validation, and change tracking while maintaining excellent performance and type safety.

## Architecture Overview

### Store System Foundation

The `Store` class (`src/lib/Store.ts`) is the central orchestrator that manages:

- Record storage via reactive `AtomMap<RecordId, Record>`
- Change history via reactive `Atom<number, RecordsDiff>`
- Validation through `StoreSchema`
- Side effects through `StoreSideEffects`
- Query capabilities through `StoreQueries`

### Record System

**BaseRecord Interface (`src/lib/BaseRecord.ts`):**

```typescript
interface BaseRecord<TypeName extends string, Id extends RecordId<UnknownRecord>> {
	readonly id: Id
	readonly typeName: TypeName
}
```

**RecordType System (`src/lib/RecordType.ts`):**

- Factory for creating typed records with validation
- Manages default properties and record scopes
- Handles ID generation (random or custom)
- Supports ephemeral properties for non-persistent data

**Record Scopes:**

- **`document`** - Persistent and synced across instances
- **`session`** - Per-instance only, not synced but may be persisted
- **`presence`** - Per-instance, synced but not persisted (e.g., cursors)

### Reactive Storage Architecture

**AtomMap (`src/lib/AtomMap.ts`):**

- Reactive replacement for `Map` that stores values in atoms
- Each record is stored in its own atom for fine-grained reactivity
- Automatic dependency tracking when accessing records
- Supports both captured and uncaptured access patterns

**Storage Structure:**

```typescript
class Store<R extends UnknownRecord> {
	private readonly records: AtomMap<IdOf<R>, R> // Individual record atoms
	readonly history: Atom<number, RecordsDiff<R>> // Change tracking
	readonly query: StoreQueries<R> // Query derivations
	readonly sideEffects: StoreSideEffects<R> // Lifecycle hooks
}
```

### Change Tracking and History

**RecordsDiff System (`src/lib/RecordsDiff.ts`):**

```typescript
interface RecordsDiff<R extends UnknownRecord> {
	added: Record<IdOf<R>, R>
	updated: Record<IdOf<R>, [from: R, to: R]>
	removed: Record<IdOf<R>, R>
}
```

**History Management:**

- `HistoryAccumulator` batches changes before flushing to listeners
- History reactor uses `throttleToNextFrame` for performance
- Automatic diff squashing for efficient updates
- Support for reversible diffs and time-travel

### Query and Indexing System

**StoreQueries (`src/lib/StoreQueries.ts`):**

- Reactive indexes for efficient querying
- `RSIndex<R, Property>` - Reactive indexes by property value
- `filterHistory()` - Type-filtered change streams
- `executeQuery()` - Complex query evaluation with incremental updates

**Query Features:**

- Automatic index maintenance via reactive derivations
- Incremental index updates using diffs
- Type-safe querying with full TypeScript support
- Performance-optimized for large record collections

### Migration System

**Migration Architecture (`src/lib/migrate.ts`):**

- Version-based migration system for schema evolution
- Support for both record-level and store-level migrations
- Dependency-aware migration ordering
- Rollback and validation during migrations

**Migration Types:**

- **Legacy Migrations** - Backward compatibility with old migration format
- **Modern Migrations** - New sequence-based migration system with dependencies
- **Subtype Migrations** - Property-level migrations for complex records

**Key Components:**

- `MigrationSequence` - Ordered migrations with dependency tracking
- `MigrationId` - Typed identifiers for migration versioning
- `createMigrationSequence()` - Builder for migration sequences
- `parseMigrationId()` - Version parsing and validation

### Side Effects System

**StoreSideEffects (`src/lib/StoreSideEffects.ts`):**

- Lifecycle hooks for record operations
- Before/after handlers for create, update, delete operations
- Operation complete handlers for batch processing
- Type-specific handler registration

**Handler Types:**

```typescript
StoreBeforeCreateHandler<R> - Pre-process records before creation
StoreAfterCreateHandler<R>  - React to record creation
StoreBeforeChangeHandler<R> - Transform records before updates
StoreAfterChangeHandler<R>  - React to record changes
StoreBeforeDeleteHandler<R> - Validate or prevent deletions
StoreAfterDeleteHandler<R>  - Clean up after deletions
```

### Schema and Validation

**StoreSchema (`src/lib/StoreSchema.ts`):**

- Type-safe record type registry
- Validation pipeline for record integrity
- Migration coordination across record types
- Schema versioning and evolution

**Validation Pipeline:**

1. `StoreValidator.validate()` - Basic record validation
2. `StoreValidator.validateUsingKnownGoodVersion()` - Optimized validation
3. Schema-level validation with error handling
4. Development-time integrity checking

## Key Data Structures and Patterns

### AtomMap Implementation

**Reactive Map Interface:**

- Implements standard `Map<K, V>` interface
- Each value stored in individual atom for granular reactivity
- Uses `ImmutableMap` internally for efficient updates
- Supports both reactive and non-reactive access patterns

**Memory Management:**

- Lazy atom creation - atoms created only when needed
- Automatic cleanup when records removed
- `UNINITIALIZED` marker for deleted values
- Efficient batch operations via transactions

### Query System Architecture

**Reactive Indexing:**

```typescript
type RSIndex<R, Property> = Computed<
	RSIndexMap<R, Property>, // Map<PropertyValue, Set<RecordId>>
	RSIndexDiff<R, Property> // Map<PropertyValue, CollectionDiff<RecordId>>
>
```

**Incremental Updates:**

- Indexes maintained via reactive derivations
- Diff-based incremental updates for performance
- Automatic cleanup of empty index entries
- Cache management for frequently used queries

### Transaction and Consistency

**Atomic Operations:**

- All multi-record operations wrapped in transactions
- Side effects run within transaction context
- Automatic rollback on validation failures
- Consistent view of data throughout operations

**Change Source Tracking:**

- `'user'` - Changes from application logic
- `'remote'` - Changes from synchronization
- Filtered listeners based on change source
- Separate handling for local vs remote updates

## Development Patterns

### Creating Record Types

```typescript
// Define record interface
interface Book extends BaseRecord<'book'> {
	title: string
	author: IdOf<Author>
	numPages: number
}

// Create record type with defaults
const Book = createRecordType<Book>('book', {
	validator: bookValidator,
	scope: 'document',
}).withDefaultProperties(() => ({
	numPages: 0,
}))

// Use in store schema
const schema = StoreSchema.create(
	{
		book: Book,
		author: Author,
	},
	{
		migrations: [
			/* migration sequences */
		],
	}
)
```

### Store Usage Patterns

```typescript
// Create store
const store = new Store({
	schema,
	initialData: savedData,
	props: customProps,
})

// Basic operations
store.put([Book.create({ title: '1984', author: authorId })])
store.update(bookId, (book) => ({ ...book, title: 'Animal Farm' }))
store.remove([bookId])

// Reactive queries
const booksByAuthor = store.query.index('book', 'author')
const authorBooks = computed('author-books', () => {
	return booksByAuthor.get().get(authorId) ?? new Set()
})
```

### Side Effects Registration

```typescript
store.sideEffects.registerAfterCreateHandler('book', (book, source) => {
	// Update author's book count
	const author = store.get(book.author)
	store.update(book.author, (a) => ({
		...a,
		bookCount: a.bookCount + 1,
	}))
})

store.sideEffects.registerBeforeDeleteHandler('author', (author, source) => {
	// Prevent deletion if author has books
	const books = store.query.index('book', 'author').get().get(author.id)
	if (books && books.size > 0) {
		return false // Prevent deletion
	}
})
```

### Migration Definition

```typescript
const migrations = createMigrationSequence({
	sequenceId: 'com.myapp.book',
	sequence: [
		{
			id: 'com.myapp.book/1',
			up: (record: any) => {
				record.publishedYear = new Date(record.publishDate).getFullYear()
				delete record.publishDate
				return record
			},
			down: (record: any) => {
				record.publishDate = new Date(record.publishedYear, 0, 1).toISOString()
				delete record.publishedYear
				return record
			},
		},
	],
})
```

## Performance Considerations

### Memory Optimization

- `AtomMap` provides reactive access without duplicating data
- `ImmutableMap` used internally for efficient updates
- Lazy atom creation reduces memory overhead
- Automatic cleanup when records removed

### Query Performance

- Reactive indexes automatically maintained
- Incremental updates via diff application
- Query result caching with automatic invalidation
- Efficient set operations for large collections

### Change Propagation

- History accumulator batches changes before notification
- `throttleToNextFrame` prevents excessive listener calls
- Scoped listeners reduce unnecessary processing
- Filtered change streams for targeted reactivity

## Integration Points

### Dependencies

- **`@tldraw/state`** - Core reactivity system
- **`@tldraw/utils`** - Utility functions and performance helpers

### Extension Points

- **Custom Validators** - Record validation logic
- **Side Effect Handlers** - Lifecycle hooks for business logic
- **Migration Sequences** - Schema evolution over time
- **Query Expressions** - Complex record filtering

### Framework Integration

- Framework-agnostic core with React bindings available
- Store instances can be shared across components
- Natural integration with `@tldraw/state-react` hooks
- SSR-compatible with proper hydration

## Key Files and Components

### Core Implementation

- **`src/lib/Store.ts`** - Main store class (~800 lines)
- **`src/lib/AtomMap.ts`** - Reactive map implementation (~300 lines)
- **`src/lib/BaseRecord.ts`** - Record type definitions (~25 lines)
- **`src/lib/RecordType.ts`** - Record factory and management (~200 lines)

### Change Management

- **`src/lib/RecordsDiff.ts`** - Diff operations and utilities (~200 lines)
- **`src/lib/StoreQueries.ts`** - Reactive indexing system (~400 lines)
- **`src/lib/StoreSideEffects.ts`** - Lifecycle hooks (~200 lines)

### Schema and Validation

- **`src/lib/StoreSchema.ts`** - Schema management (~300 lines)
- **`src/lib/migrate.ts`** - Migration system (~500 lines)

### Support Infrastructure

- **`src/lib/executeQuery.ts`** - Query evaluation engine
- **`src/lib/IncrementalSetConstructor.ts`** - Efficient set operations
- **`src/lib/devFreeze.ts`** - Development-time immutability
- **`src/lib/setUtils.ts`** - Set operation utilities

## Development Guidelines

### Record Design

- Keep records immutable - always return new objects
- Use appropriate record scopes for different data types
- Design records for efficient diffing when needed
- Implement proper validation for data integrity

### Store Configuration

- Initialize stores with appropriate schema and props
- Configure migration sequences for schema evolution
- Set up side effects for business logic enforcement
- Use scoped listeners for performance optimization

### Query Patterns

- Leverage reactive indexes for frequently accessed data
- Use computed signals to derive complex query results
- Prefer incremental updates over full recomputation
- Cache expensive query results appropriately

### Migration Best Practices

- Version changes incrementally with clear migration paths
- Test migrations thoroughly with real data
- Handle migration failures gracefully
- Document breaking changes and migration requirements

### Performance Optimization

- Use `__unsafe__getWithoutCapture()` for hot paths that don't need reactivity
- Batch operations with transactions
- Implement efficient `isEqual` functions for complex records
- Profile query performance for large datasets

## Testing Patterns

### Test Structure

- Unit tests for individual components in `src/lib/test/`
- Integration tests for store operations
- Migration testing with sample data
- Performance testing for large datasets

### Common Test Scenarios

- Record CRUD operations with validation
- Side effect execution and error handling
- Migration forward and backward compatibility
- Query correctness and performance
- Concurrent access and transaction handling

## Common Pitfalls

1. **Memory Leaks:** Not cleaning up listeners and computed queries
2. **Side Effect Loops:** Circular dependencies in side effect handlers
3. **Migration Failures:** Insufficient testing of schema changes
4. **Performance Issues:** Over-reactive queries without proper batching
5. **Validation Errors:** Inconsistent validation between create and update paths
6. **Transaction Scope:** Forgetting to wrap multi-record operations in transactions
