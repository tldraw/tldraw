---
title: "@tldraw/store"
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - store
  - reactive
  - database
  - records
  - state
---

The `@tldraw/store` package is a reactive record storage system built on `@tldraw/state`. It provides a type-safe, event-driven database for managing collections of records with automatic reactivity, validation, migrations, and change tracking.

## Overview

Think of the store as a reactive database designed for client-side applications. It combines the reactive primitives from `@tldraw/state` with a robust record management system, giving you:

- **Type-safe record storage** with full TypeScript inference
- **Automatic reactivity** through fine-grained reactive atoms
- **Change tracking** with efficient diff computation
- **Validation** to ensure data integrity
- **Migrations** for schema evolution
- **Side effects** for business logic enforcement
- **Query system** with reactive indexing

The store is framework-agnostic but integrates naturally with React through `@tldraw/state-react`. It's the foundation for how tldraw manages all document data, including shapes, pages, and assets.

## Installation

```bash
npm install @tldraw/store @tldraw/state
```

The store depends on `@tldraw/state` for its reactive primitives.

## Core concepts

### Records

A record is the basic unit of data storage. Every record must extend `BaseRecord`:

```typescript
import { BaseRecord, RecordId } from '@tldraw/store'

interface Book extends BaseRecord<'book', RecordId<Book>> {
  title: string
  author: string
  publishedYear: number
  isbn: string
}
```

All records have:
- `id` - Unique identifier for the record
- `typeName` - String identifying the record type

### Record types

Record types are factories that create and manage records of a specific type. Create them with `createRecordType`:

```typescript
import { createRecordType } from '@tldraw/store'

const Book = createRecordType<Book>('book', {
  scope: 'document',
  validator: { validate: (value) => value as Book },
}).withDefaultProperties(() => ({
  publishedYear: new Date().getFullYear(),
  isbn: '',
}))
```

The `RecordType` class provides:
- **Factory method** for creating new records
- **Default properties** that auto-populate new records
- **Validation** to ensure data integrity
- **Scope** that determines persistence behavior

### Record scopes

Scopes control how records are persisted and synchronized:

| Scope | Persisted | Synced | Use cases |
|-------|-----------|--------|-----------|
| `document` | Yes | Yes | Shapes, pages, persistent data |
| `session` | Maybe | No | User preferences, UI state |
| `presence` | No | Yes | Cursors, selections, ephemeral collaboration state |

```typescript
// Document-scoped records are fully persistent
const Page = createRecordType<PageRecord>('page', {
  scope: 'document',
})

// Presence records sync but don't persist
const Cursor = createRecordType<CursorRecord>('cursor', {
  scope: 'presence',
})
```

## Creating a store

### Define your schema

A schema describes all record types in your store:

```typescript
import { StoreSchema } from '@tldraw/store'

// Define record types
const Book = createRecordType<Book>('book', {
  scope: 'document',
  validator: bookValidator,
})

const Author = createRecordType<Author>('author', {
  scope: 'document',
  validator: authorValidator,
})

// Create schema
const schema = StoreSchema.create({
  book: Book,
  author: Author,
})
```

### Initialize the store

```typescript
import { Store } from '@tldraw/store'

const store = new Store({
  schema,
  props: {}, // Custom properties for your application
})
```

### With initial data

```typescript
const store = new Store({
  schema,
  initialData: {
    'book:1': Book.create({
      id: 'book:1' as RecordId<Book>,
      title: '1984',
      author: 'George Orwell',
      publishedYear: 1949,
      isbn: '978-0451524935',
    }),
  },
})
```

## Basic operations

### Creating records

```typescript
// Using the record type factory
const book = Book.create({
  title: 'Animal Farm',
  author: 'George Orwell',
  publishedYear: 1945,
  isbn: '978-0451526342',
})

// Add to store
store.put([book])

// Create and add in one step
const id = Book.createId()
store.put([
  Book.create({
    id,
    title: 'Brave New World',
    author: 'Aldous Huxley',
  }),
])
```

### Reading records

```typescript
// Get a single record
const book = store.get(bookId)

// Check if record exists
const exists = store.has(bookId)

// Get all records of a type
const allBooks = store.allRecords().filter((r) => r.typeName === 'book')

// Get records by multiple IDs
const books = [id1, id2, id3].map((id) => store.get(id)).filter(Boolean)
```

### Updating records

```typescript
// Update with a partial record
store.update(bookId, { title: 'New Title' })

// Update with a function
store.update(bookId, (book) => ({
  ...book,
  publishedYear: 1950,
}))

// Update multiple records
store.put([
  { ...book1, title: 'Updated 1' },
  { ...book2, title: 'Updated 2' },
])
```

### Deleting records

```typescript
// Delete a single record
store.remove([bookId])

// Delete multiple records
store.remove([bookId1, bookId2, bookId3])

// Delete all records of a type
const bookIds = store
  .allRecords()
  .filter((r) => r.typeName === 'book')
  .map((r) => r.id)
store.remove(bookIds)
```

## Reactive queries

The store provides reactive indexing through `StoreQueries`. Queries automatically update when underlying data changes.

### Property indexing

Create indexes on record properties for efficient lookups:

```typescript
import { computed } from '@tldraw/state'

// Get the reactive index
const booksByAuthor = store.query.index('book', 'author')

// Use in computed values
const orwellBooks = computed('orwell-books', () => {
  const index = booksByAuthor.get()
  return index.get('George Orwell') ?? new Set()
})

// Access in reactive contexts
const BookList = () => {
  const bookIds = orwellBooks.get()
  return <div>{/* Render books */}</div>
}
```

### Filtering changes

Listen to changes for specific record types:

```typescript
const bookChanges = store.query.filterHistory('book')

const unsubscribe = bookChanges.attach(() => {
  const diff = bookChanges.get()
  console.log('Added books:', Object.keys(diff.added))
  console.log('Updated books:', Object.keys(diff.updated))
  console.log('Removed books:', Object.keys(diff.removed))
})
```

### Custom queries

Execute complex queries with automatic incremental updates:

```typescript
import { executeQuery } from '@tldraw/store'

const recentBooks = computed('recent-books', () => {
  const currentYear = new Date().getFullYear()
  return executeQuery(store, {
    type: 'book',
    filter: (book) => book.publishedYear >= currentYear - 5,
  })
})
```

## AtomMap architecture

The store uses `AtomMap`, a reactive replacement for JavaScript's `Map` that stores each value in its own atom. This provides fine-grained reactivity—only components that access specific records re-render when those records change.

```typescript
// Under the hood, the store uses AtomMap
class Store {
  private readonly records: AtomMap<RecordId, Record>
}

// Each record is stored in a separate atom
// When you access a record, you subscribe only to that atom
const book = store.get(bookId) // Subscribes to book:123's atom

// Updating one record only notifies subscribers of that specific atom
store.update(bookId, { title: 'New Title' }) // Only book:123 subscribers notified
```

### Non-reactive access

For performance-critical code that doesn't need reactivity:

```typescript
// Regular access (reactive, creates subscription)
const book = store.get(bookId)

// Non-reactive access (no subscription created)
const book = store.unsafeGetWithoutCapture(bookId)
```

## Change tracking and history

The store maintains a reactive history of all changes through `RecordsDiff`:

```typescript
interface RecordsDiff<R> {
  added: Record<RecordId, R>
  updated: Record<RecordId, [from: R, to: R]>
  removed: Record<RecordId, R>
}
```

### Listening to changes

```typescript
// Listen to all changes
const unsubscribe = store.listen(
  (entry) => {
    console.log('Change source:', entry.source) // 'user' or 'remote'
    console.log('Added:', entry.changes.added)
    console.log('Updated:', entry.changes.updated)
    console.log('Removed:', entry.changes.removed)
  },
  { scope: 'document', source: 'all' }
)

// Clean up
unsubscribe()
```

### Change sources

Changes are tagged with their source:

- `'user'` - Changes from local application logic
- `'remote'` - Changes from synchronization

```typescript
// Listen only to user changes
store.listen(
  (entry) => {
    // Only local changes trigger this
  },
  { source: 'user', scope: 'all' }
)

// Listen only to remote changes
store.listen(
  (entry) => {
    // Only sync changes trigger this
  },
  { source: 'remote', scope: 'all' }
)
```

### Merging changes

Apply changes from another store or snapshot:

```typescript
// Merge remote changes
store.mergeRemoteChanges(() => {
  store.put([remoteBook1, remoteBook2])
  store.remove([deletedId])
})

// Changes are marked as source: 'remote'
```

## Side effects

Side effects let you respond to record lifecycle events and enforce business logic. They run within the store's transaction context, ensuring consistency.

### Registering side effects

```typescript
// After create
store.sideEffects.registerAfterCreateHandler('book', (book, source) => {
  // Update author's book count
  const author = store.get(book.author)
  if (author) {
    store.update(book.author, (a) => ({
      ...a,
      bookCount: a.bookCount + 1,
    }))
  }
})

// Before delete
store.sideEffects.registerBeforeDeleteHandler('author', (author, source) => {
  // Prevent deletion if author has books
  const books = store
    .allRecords()
    .filter((r) => r.typeName === 'book' && r.author === author.id)
  if (books.length > 0) {
    return false // Prevents deletion
  }
})

// After change
store.sideEffects.registerAfterChangeHandler('book', (prev, next, source) => {
  if (prev.title !== next.title) {
    console.log(`Book renamed: ${prev.title} → ${next.title}`)
  }
})
```

### Available handlers

| Handler | Timing | Can prevent? | Use cases |
|---------|--------|--------------|-----------|
| `registerBeforeCreateHandler` | Before creation | Yes | Validation, defaults |
| `registerAfterCreateHandler` | After creation | No | Cascade creates, notifications |
| `registerBeforeChangeHandler` | Before update | Yes | Validation, normalization |
| `registerAfterChangeHandler` | After update | No | Cascade updates, derived data |
| `registerBeforeDeleteHandler` | Before deletion | Yes | Referential integrity checks |
| `registerAfterDeleteHandler` | After deletion | No | Cascade deletes, cleanup |

### Operation complete handlers

Run logic after all side effects complete:

```typescript
store.sideEffects.registerOperationCompleteHandler((source) => {
  // Called once after all side effects from an operation finish
  console.log('Operation complete, source:', source)
  notifyUI()
})
```

## Migrations

Migrations transform data as your schema evolves. The store supports version-based migrations with dependency tracking.

### Basic migration

```typescript
import { createMigrationSequence } from '@tldraw/store'

const bookMigrations = createMigrationSequence({
  sequenceId: 'com.myapp.book',
  sequence: [
    {
      id: 'com.myapp.book/1',
      scope: 'record',
      filter: (record) => record.typeName === 'book',
      up: (record: any) => {
        // Add a new field with default value
        return {
          ...record,
          genre: 'unknown',
        }
      },
      down: (record: any) => {
        // Reverse the migration
        const { genre, ...rest } = record
        return rest
      },
    },
  ],
})
```

### Migration IDs

Use `createMigrationIds` for cleaner code:

```typescript
import { createMigrationIds } from '@tldraw/store'

const versions = createMigrationIds('com.myapp.book', {
  AddGenre: 1,
  AddPublisher: 2,
  RenameFields: 3,
})

const bookMigrations = createMigrationSequence({
  sequenceId: 'com.myapp.book',
  sequence: [
    {
      id: versions.AddGenre,
      scope: 'record',
      filter: (r) => r.typeName === 'book',
      up: (book: any) => ({ ...book, genre: 'unknown' }),
    },
    {
      id: versions.AddPublisher,
      scope: 'record',
      filter: (r) => r.typeName === 'book',
      up: (book: any) => ({ ...book, publisher: '' }),
    },
  ],
})
```

### Store-level migrations

Migrations can operate on the entire store:

```typescript
const storeMigrations = createMigrationSequence({
  sequenceId: 'com.myapp.store',
  sequence: [
    {
      id: 'com.myapp.store/1',
      scope: 'store',
      up: (store: any) => {
        // Transform the entire store structure
        return {
          ...store,
          schema: {
            ...store.schema,
            schemaVersion: 2,
          },
        }
      },
    },
  ],
})
```

### Adding migrations to schema

```typescript
const schema = StoreSchema.create(
  {
    book: Book,
    author: Author,
  },
  {
    migrations: [bookMigrations, authorMigrations, storeMigrations],
  }
)
```

### Migration dependencies

Migrations can depend on other migrations:

```typescript
const sequence = [
  {
    id: 'com.myapp.book/1',
    scope: 'record',
    filter: (r) => r.typeName === 'book',
    up: (book: any) => ({ ...book, genre: 'unknown' }),
  },
  {
    dependsOn: ['com.myapp.author/1'], // This must run first
  },
  {
    id: 'com.myapp.book/2',
    scope: 'record',
    filter: (r) => r.typeName === 'book',
    up: (book: any) => ({ ...book, authorName: getAuthorName(book.author) }),
  },
]
```

## Snapshots and persistence

### Creating snapshots

```typescript
// Get complete store state
const snapshot = store.getSnapshot()

// Save to storage
localStorage.setItem('myapp-store', JSON.stringify(snapshot))

// Get snapshot for specific scopes
const documentSnapshot = store.getSnapshot('document')
```

### Loading snapshots

```typescript
// Load from storage
const savedData = localStorage.getItem('myapp-store')
if (savedData) {
  const snapshot = JSON.parse(savedData)
  store.loadSnapshot(snapshot)
}

// Create store with initial snapshot
const store = new Store({
  schema,
  initialData: snapshot,
})
```

### Extracting changes

```typescript
// Get all changes since a point in time
const changes = store.extractingChanges(() => {
  // Make changes
  store.put([book1, book2])
  store.update(bookId, { title: 'Updated' })
  store.remove([oldBookId])
})

// Apply changes to another store
otherStore.applyDiff(changes)
```

## Validation

The store validates records when they're created or updated. Define validators with your record types:

```typescript
import { T } from '@tldraw/validate'

const bookValidator = T.object({
  id: T.string,
  typeName: T.literal('book'),
  title: T.string,
  author: T.string,
  publishedYear: T.number,
  isbn: T.string.refine((isbn) => isbn.length >= 10, 'Invalid ISBN'),
})

const Book = createRecordType<Book>('book', {
  validator: { validate: (value) => bookValidator.validate(value) },
  scope: 'document',
})
```

### Validation timing

Validation runs:
- When creating records via `store.put()`
- When updating records via `store.update()`
- When loading snapshots via `store.loadSnapshot()`
- Never during migrations (migrations can temporarily break validation)

### Development mode checks

In development, the store performs additional checks:

```typescript
// Records are frozen to prevent mutation
const book = store.get(bookId)
book.title = 'New Title' // Error in development: Cannot assign to read only property

// Always create new objects when updating
store.update(bookId, (book) => ({
  ...book,
  title: 'New Title',
}))
```

## Performance optimization

### Batching updates

Group multiple changes into a single transaction:

```typescript
import { transact } from '@tldraw/state'

transact(() => {
  store.put([book1, book2, book3])
  store.update(authorId, { bookCount: 3 })
  store.remove([oldBookId])
})

// Listeners fire once for all changes
// Side effects run once per record type
```

### Non-reactive access

Skip reactive subscriptions in hot paths:

```typescript
// Reactive access (creates subscription)
for (const id of bookIds) {
  const book = store.get(id) // Subscribes to each book
  process(book)
}

// Non-reactive access (no subscriptions)
for (const id of bookIds) {
  const book = store.unsafeGetWithoutCapture(id) // No subscription overhead
  process(book)
}
```

### Query result caching

Computed queries cache results automatically:

```typescript
const expensiveQuery = computed('expensive', () => {
  // This only runs when underlying data changes
  return store
    .allRecords()
    .filter((r) => r.typeName === 'book')
    .map((book) => expensiveComputation(book))
})

// Multiple calls return cached result
const result1 = expensiveQuery.get()
const result2 = expensiveQuery.get() // Returns cached value
```

### History throttling

The store automatically throttles history updates to animation frames:

```typescript
// Many rapid changes...
for (let i = 0; i < 1000; i++) {
  store.update(bookId, { title: `Title ${i}` })
}

// History listeners fire at most once per frame
// This prevents overwhelming listeners with rapid changes
```

## Integration patterns

### React integration

Use with `@tldraw/state-react`:

```typescript
import { useValue } from '@tldraw/state-react'

function BookList() {
  // Reactive value updates component automatically
  const books = useValue(
    'books',
    () => {
      return store
        .allRecords()
        .filter((r) => r.typeName === 'book')
    },
    [store]
  )

  return (
    <ul>
      {books.map((book) => (
        <li key={book.id}>{book.title}</li>
      ))}
    </ul>
  )
}
```

### Custom store props

Pass application-specific data to your store:

```typescript
interface MyStoreProps {
  userId: string
  apiClient: ApiClient
}

const store = new Store<UnknownRecord, MyStoreProps>({
  schema,
  props: {
    userId: 'user-123',
    apiClient: new ApiClient(),
  },
})

// Access in side effects
store.sideEffects.registerAfterCreateHandler('book', (book) => {
  const { apiClient, userId } = store.props
  apiClient.logBookCreation(book, userId)
})
```

### Multiple stores

Create multiple independent stores:

```typescript
const documentStore = new Store({ schema: documentSchema })
const uiStore = new Store({ schema: uiSchema })

// Stores don't share data
documentStore.put([book])
uiStore.has(book.id) // false
```

## Key files

- packages/store/src/lib/Store.ts - Main store class and core operations
- packages/store/src/lib/AtomMap.ts - Reactive map implementation
- packages/store/src/lib/BaseRecord.ts - Record type definitions
- packages/store/src/lib/RecordType.ts - Record factory and management
- packages/store/src/lib/RecordsDiff.ts - Change tracking and diff utilities
- packages/store/src/lib/StoreQueries.ts - Reactive indexing and query system
- packages/store/src/lib/StoreSideEffects.ts - Side effect registration and execution
- packages/store/src/lib/StoreSchema.ts - Schema management and validation
- packages/store/src/lib/migrate.ts - Migration system and utilities
- packages/store/src/lib/executeQuery.ts - Query execution engine
- packages/store/CONTEXT.md - Comprehensive package documentation

## Related

- [@tldraw/state](./state.md) - Reactive primitives that power the store
- [@tldraw/editor](./editor.md) - Uses store for managing editor state
- [Architecture overview](../overview/architecture-overview.md) - How store fits in the SDK
- [Persistence guide](../guides/persistence.md) - Saving and loading data
- [Collaboration guide](../guides/collaboration.md) - Multiplayer with store sync
