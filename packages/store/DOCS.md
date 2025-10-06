# @tldraw/store

A reactive record storage library built on `@tldraw/state` that provides type-safe, event-driven database functionality for managing collections of records. You can think of it as a reactive, in-memory database that automatically tracks changes and provides powerful querying capabilities while maintaining excellent performance and type safety.

> Important: This documentation assumes you have a basic understanding of reactive programming concepts and TypeScript. The store is built on top of `@tldraw/state` signals, so familiarity with atoms and computed values will be helpful.

## 1. Introduction

The `@tldraw/store` manages collections of typed **records** - immutable objects that represent your application's data. Unlike traditional databases, every piece of data in the store is reactive, meaning your application will automatically update when the underlying data changes.

The store provides:

- **Reactive storage** - Data changes automatically trigger updates throughout your application
- **Type safety** - Full TypeScript support with compile-time validation
- **Change tracking** - Complete history of all modifications with undo/redo support
- **Migrations** - Seamless schema evolution as your application grows
- **Side effects** - Lifecycle hooks for implementing business logic
- **Queries** - Reactive indexes and filtering for efficient data access

## 2. Core Concepts

### Records: The Foundation

**Records** are immutable data objects that extend the `BaseRecord` interface. Every record has an `id` and a `typeName` that identifies its type:

```ts
import { BaseRecord, RecordId } from '@tldraw/store'

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
	author: string
	publishedYear: number
	inStock: boolean
}
```

### Record Types: Factories for Records

A **RecordType** is a factory that creates and manages records of a specific type. You define how records are created, validated, and what their default properties are:

```ts
import { createRecordType } from '@tldraw/store'

const Book = createRecordType<Book>('book', {
	validator: bookValidator, // Optional validation function
	scope: 'document', // Persistence behavior
}).withDefaultProperties(() => ({
	inStock: true,
	publishedYear: new Date().getFullYear(),
}))
```

// Create a new book

## 2. Core Concepts

### Records: The Foundation

**Records** are immutable data objects that extend the `BaseRecord` interface. Every record has an `id` and a `typeName` that identifies its type:

```ts
import { BaseRecord, RecordId } from '@tldraw/store'

interface Author extends BaseRecord<'author', RecordId<Author>> {
	name: string
}

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
	authorId: RecordId<Author>
	publishedYear: number
	inStock: boolean
}
```

### Record Types: Factories for Records

A **RecordType** is a factory that creates and manages records of a specific type. You define how records are created, validated, and what their default properties are:

```ts
import { createRecordType } from '@tldraw/store'

const Author = createRecordType<Author>('author', {
	scope: 'document',
})

const Book = createRecordType<Book>('book', {
	scope: 'document', // Persistence behavior
}).withDefaultProperties(() => ({
	inStock: true,
	publishedYear: new Date().getFullYear(),
}))

// Create a new author and book
const orwell = Author.create({ name: 'George Orwell' })
const book = Book.create({
	title: '1984',
	authorId: orwell.id,
})
// Results in: { id: 'book:abc123', typeName: 'book', title: '1984', authorId: 'author:xyz789', publishedYear: 2025, inStock: true }
```

## 3. Basic Usage

### Creating and Storing Records

You add records to the store using the `put` method:

```ts
// Create some authors and books
const orwell = Author.create({ name: 'George Orwell' })
const huxley = Author.create({ name: 'Aldous Huxley' })

const books = [
	Book.create({ title: '1984', authorId: orwell.id }),
	Book.create({ title: 'Animal Farm', authorId: orwell.id }),
	Book.create({ title: 'Brave New World', authorId: huxley.id }),
]

// Add authors and books to the store
store.put([orwell, huxley, ...books])
```

> Tip: The `put` method handles both creating new records and updating existing ones. If a record with the same ID already exists, it will be updated.

### Reading Records

You can read individual records or access all records of a type:

```ts
// Get a specific book by ID
const book = store.get(books[0].id)
console.log(book?.title) // "1984"

// Get all records in the store
const allRecords = store.allRecords()

// Check if a record exists
const hasBook = store.has(books[0].id) // true
```

### Updating Records

Use the `update` method to modify existing records:

```ts
// Update a book's stock status
store.update(book.id, (currentBook) => ({
	...currentBook,
	inStock: false,
}))
```

The update function receives the current record and returns a new record with your changes applied.

### Removing Records

Remove records using their IDs:

```ts
// Remove a single book
store.remove([book.id])

// Remove multiple books
store.remove([book1.id, book2.id, book3.id])
```

## 4. Reactive Queries and Indexing

### Understanding Reactive Indexes

The store automatically maintains **reactive indexes** that allow efficient querying of your data. These indexes update automatically when records change:

```ts
// Create an index by author
// (assuming `orwell` is an Author record we've created)
const booksByAuthor = store.query.index('book', 'authorId')

// Get all books by George Orwell
const orwellBooks = booksByAuthor.get().get(orwell.id)
console.log(orwellBooks) // Set<RecordId<Book>>
```

The index returns a `Map` where keys are property values and values are `Set`s of record IDs that have that property value.

### Reactive Queries with Computed Values

Combine indexes with computed values to create reactive queries:

```ts
import { computed } from '@tldraw/state'

// Create a reactive query for in-stock books
const inStockBooks = store.query.records('book', () => ({
	inStock: { eq: true },
}))

// Then, group them by author in a second computed value
const inStockBooksByAuthor = computed('inStockBooksByAuthor', () => {
	const results = new Map<RecordId<Author>, Book[]>()
	for (const book of inStockBooks.get()) {
		const authorBooks = results.get(book.authorId) || []
		authorBooks.push(book)
		results.set(book.authorId, authorBooks)
	}
	return results
})

// The computed value automatically updates when in-stock books change
console.log(inStockBooksByAuthor.get()) // Map<RecordId<Author>, Book[]>
```

### The Store: Your Reactive Database

The **Store** is the central container that manages all your records. It provides reactive access to data and automatically tracks changes:

```ts
import { Store, StoreSchema } from '@tldraw/store'

// Create a schema that defines all your record types
const schema = StoreSchema.create({
	book: Book,
	// ... other record types
})

// Create the store
const store = new Store({
	schema,
	props: {}, // Custom properties for your application
})
```

## 3. Basic Usage

### Creating and Storing Records

You add records to the store using the `put` method:

```ts
// Create some books
const books = [
	Book.create({ title: '1984', author: 'George Orwell' }),
	Book.create({ title: 'Animal Farm', author: 'George Orwell' }),
	Book.create({ title: 'Brave New World', author: 'Aldous Huxley' }),
]

// Add them to the store
store.put(books)
```

> Tip: The `put` method handles both creating new records and updating existing ones. If a record with the same ID already exists, it will be updated.

### Reading Records

You can read individual records or access all records of a type:

```ts
// Get a specific book by ID
const book = store.get(books[0].id)
console.log(book?.title) // "1984"

// Get all records in the store
const allRecords = store.allRecords()

// Check if a record exists
const hasBook = store.has(books[0].id) // true
```

### Updating Records

Use the `update` method to modify existing records:

```ts
// Update a book's stock status
store.update(book.id, (currentBook) => ({
	...currentBook,
	inStock: false,
}))
```

The update function receives the current record and returns a new record with your changes applied.

### Removing Records

Remove records using their IDs:

```ts
// Remove a single book
store.remove([book.id])

// Remove multiple books
store.remove([book1.id, book2.id, book3.id])
```

## 4. Reactive Queries and Indexing

### Understanding Reactive Indexes

The store automatically maintains **reactive indexes** that allow efficient querying of your data. These indexes update automatically when records change:

```ts
// Create an index by author
const booksByAuthor = store.query.index('book', 'author')

// Get all books by George Orwell
const orwellBooks = booksByAuthor.get().get('George Orwell')
console.log(orwellBooks) // Set<RecordId<Book>>
```

The index returns a `Map` where keys are property values and values are `Set`s of record IDs that have that property value.

### Reactive Queries with Computed Values

Combine indexes with computed values to create reactive queries:

```ts
import { computed } from '@tldraw/state'

// Create a reactive query for books in stock by author
const inStockBooksByAuthor = computed('inStockBooksByAuthor', () => {
	const results = new Map<string, Book[]>()

	// Get all books
	for (const book of store.allRecords()) {
		if (book.typeName === 'book' && book.inStock) {
			const authorBooks = results.get(book.author) || []
			authorBooks.push(book)
			results.set(book.author, authorBooks)
		}
	}

	return results
})

// The computed value automatically updates when books change
console.log(inStockBooksByAuthor.get()) // Map<string, Book[]>
```

### Filtering History for Specific Record Types

You can create reactive computations that track changes to specific record types:

```ts
import { react } from '@tldraw/state'

// Get a reactive history computation for books only
const bookHistory = store.query.filterHistory('book')

// React to book changes
const dispose = react('book-changes', () => {
	const currentEpoch = bookHistory.get()
	console.log('Book history updated, current epoch:', currentEpoch)

	// You can get the actual changes using getDiffSince if needed
	// const changes = bookHistory.getDiffSince(previousEpoch)
})
```

> Tip: The `filterHistory` method returns a `Computed` that tracks changes to records of a specific type. Use it with `react()` from `@tldraw/state` to respond to changes.

## 5. Record Scopes and Persistence

### Understanding Record Scopes

Records have different **scopes** that determine how they're persisted and synchronized:

```ts
const DocumentRecord = createRecordType<DocumentData>('document', {
	scope: 'document', // Persisted and synced across instances
})

const SessionRecord = createRecordType<SessionData>('session', {
	scope: 'session', // Per-instance, may be persisted but not synced
})

const PresenceRecord = createRecordType<PresenceData>('presence', {
	scope: 'presence', // Per-instance, synced but not persisted (like cursors)
})
```

- **`document`** - Permanent data that should be saved and shared
- **`session`** - Per-instance data that might be saved locally
- **`presence`** - Temporary data that's shared but not saved

### Serialization and Snapshots

You can serialize the store's data for persistence:

```ts
// Get a snapshot of all document records
const snapshot = store.getStoreSnapshot('document')

// Save it somewhere
localStorage.setItem('myApp', JSON.stringify(snapshot))

// Later, restore the data
const saved = JSON.parse(localStorage.getItem('myApp'))
store.loadStoreSnapshot(saved)
```

> Note: The store automatically handles migrations when loading snapshots from older versions of your schema.

## 6. Side Effects and Business Logic

### Understanding Side Effects

**Side effects** are hooks that let you implement business logic in response to record changes. They run automatically when records are created, updated, or deleted:

```ts
// React when books are created
store.sideEffects.registerAfterCreateHandler('book', (book, source) => {
	console.log(`New book added: ${book.title}`)

	// Update author statistics
	updateAuthorBookCount(book.authorId, 1)
})

// Validate before updates
store.sideEffects.registerBeforeChangeHandler('book', (prev, next, source) => {
	// Ensure price never goes negative
	if (next.price < 0) {
		return { ...next, price: 0 }
	}
	return next
})

// Clean up when books are deleted
store.sideEffects.registerAfterDeleteHandler('book', (book, source) => {
	console.log(`Book removed: ${book.title}`)
	updateAuthorBookCount(book.authorId, -1)
})
```

### Change Sources

Side effects receive a `source` parameter that tells you where the change originated:

- `'user'` - Changes from your application logic
- `'remote'` - Changes from synchronization or external sources

```ts
store.sideEffects.registerAfterCreateHandler('book', (book, source) => {
	if (source === 'user') {
		// Only send notifications for local changes
		notifyUser(`You added "${book.title}" to your library`)
	}
})
```

### Before Handlers: Validation and Transformation

**Before handlers** run before changes are applied and can validate or transform the data:

```ts
// Prevent deletion of books that are checked out
store.sideEffects.registerBeforeDeleteHandler('book', (book, source) => {
	if (book.checkedOut) {
		// Return false to prevent the deletion
		return false
	}
})

// Transform data before storing
store.sideEffects.registerBeforeCreateHandler('book', (book, source) => {
	// Always store titles in title case
	return {
		...book,
		title: toTitleCase(book.title),
	}
})
```

## 7. Schema Evolution with Migrations

### Creating Migration Sequences

As your application evolves, you'll need to update your data structure. **Migrations** handle this automatically:

```ts
import { createMigrationSequence } from '@tldraw/store'

const bookMigrations = createMigrationSequence({
	sequenceId: 'com.myapp.book',
	sequence: [
		// Migration 1: Add publishedYear field
		{
			id: 'com.myapp.book/add-published-year',
			scope: 'record',
			up: (record: any) => {
				// Convert publishDate string to publishedYear number
				record.publishedYear = new Date(record.publishDate).getFullYear()
				delete record.publishDate
				return record
			},
			down: (record: any) => {
				// Reverse the migration if needed
				record.publishDate = new Date(record.publishedYear, 0, 1).toISOString()
				delete record.publishedYear
				return record
			},
		},

		// Migration 2: Add genre field with default
		{
			id: 'com.myapp.book/add-genre',
			scope: 'record',
			up: (record: any) => {
				record.genre = record.genre || 'Fiction'
				return record
			},
			down: (record: any) => {
				delete record.genre
				return record
			},
		},
	],
})

// Include migrations in your schema
const schema = StoreSchema.create(
	{
		book: Book,
	},
	{
		migrations: [bookMigrations],
	}
)
```

### Migration Safety

The store automatically applies migrations when loading data from older versions:

```ts
// This snapshot might be from an older version
const oldSnapshot = JSON.parse(localStorage.getItem('myApp'))

// Migrations run automatically during load
store.loadStoreSnapshot(oldSnapshot)
// All records are now up to date with current schema
```

> Tip: Always test your migrations thoroughly with real data before deploying to production.

## 8. Advanced Topics

### Transactional Operations

The store automatically ensures that related operations happen atomically. When you perform multiple operations in response to user actions or side effects, they are automatically grouped together for consistency and performance.

### Custom Computed Caches

Create **computed caches** for expensive derivations that should be memoized per record:

```ts
const expensiveBookData = store.createComputedCache('expensiveBookData', (book: Book) => {
	// This expensive computation is cached per book
	return performExpensiveAnalysis(book)
})

// Access cached data
const analysis = expensiveBookData.get(book.id)
```

The cache automatically updates when the underlying record changes and cleans up when records are deleted.

### Extracting Changes

You can capture changes that occur within a function:

```ts
const changes = store.extractingChanges(() => {
	// Make various changes
	store.put([newBook])
	store.update(book.id, (b) => ({ ...b, title: 'New Title' }))
})

// `changes` contains a diff of what was modified
console.log(changes) // { added: {...}, updated: {...}, removed: {...} }
```

This is useful for implementing undo/redo systems or understanding what changed during complex operations.

## 9. Debugging

The store provides several tools for understanding what's happening in your application.

### Store Listeners

Add listeners to react to changes in your store:

```ts
// Listen to all changes
const removeListener = store.listen((entry) => {
	console.log('Changes occurred:', entry.changes)
	console.log('Source:', entry.source) // 'user' or 'remote'
})

// Listen only to document changes from user actions
const removeDocumentListener = store.listen(
	(entry) => {
		console.log('User made document changes:', entry.changes)
	},
	{
		source: 'user',
		scope: 'document',
	}
)
```

### Understanding Record Validation

The store validates all records when they're created or updated. Validation errors provide detailed information:

```ts
try {
	store.put([invalidBook])
} catch (error) {
	console.log('Validation failed:', error.message)
	// Check your record's structure and validator function
}
```

> Tip: Validation runs in development mode to help catch errors early. Make sure your validators are efficient since they run on every change.

## 10. Integration

### Framework Integration

The store is framework-agnostic but integrates well with React through `@tldraw/state-react`:

```ts
import { track } from '@tldraw/state-react'

const BookList = track(() => {
	const books = store.allRecords().filter(r => r.typeName === 'book')

	return (
		<ul>
			{books.map(book => (
				<li key={book.id}>{book.title} by {book.author}</li>
			))}
		</ul>
	)
})
```

The `track` function automatically subscribes the component to relevant store changes.

### Persistence Strategies

Implement different persistence strategies based on your needs:

```ts
// Auto-save on every change
store.listen((entry) => {
	if (entry.source === 'user') {
		const snapshot = store.getStoreSnapshot()
		saveToDatabase(snapshot)
	}
})

// Batch saves every few seconds
let saveTimeout: NodeJS.Timeout
store.listen(() => {
	clearTimeout(saveTimeout)
	saveTimeout = setTimeout(() => {
		const snapshot = store.getStoreSnapshot()
		saveToDatabase(snapshot)
	}, 5000)
})
```

### Synchronization

For multi-user applications, use the store with `@tldraw/sync`:

```ts
// Merge remote changes
store.mergeRemoteChanges(() => {
	// Apply changes from other users
	store.put(remoteRecords)
})
```

Changes merged this way are marked with `source: 'remote'` so your side effects can handle them appropriately.

## 11. Performance Considerations

### Memory Management

The store uses several strategies to maintain good performance:

- **Lazy atom creation** - Atoms are only created when records are accessed reactively
- **Automatic cleanup** - Atoms are cleaned up when records are deleted
- **Efficient indexes** - Reactive indexes use incremental updates rather than full rebuilds
- **Change batching** - Multiple changes are batched together before notifying listeners

### Query Optimization

For best performance with large datasets:

```ts
// Use indexes for common queries
const booksByGenre = store.query.index('book', 'genre')
const sciFiBooks = booksByGenre.get().get('Science Fiction')

// Avoid reactive access in hot paths
const book = store.unsafeGetWithoutCapture(bookId) // No reactive subscription

// Use computed caches for expensive derivations
const expensiveData = store.createComputedCache('expensive', computeExpensiveData)
```

### Side Effect Performance

Keep side effects fast since they run synchronously:

```ts
// Good: Fast side effect
store.sideEffects.registerAfterCreateHandler('book', (book) => {
	updateQuickStats(book)
})

// Better: Async work in background
store.sideEffects.registerAfterCreateHandler('book', (book) => {
	queueAsyncWork(book) // Handle async work separately
})
```

## 12. Common Patterns

### Repository Pattern

Create typed repositories for cleaner APIs:

```ts
class BookRepository {
	constructor(private store: Store<Book>) {}

	findByAuthor(author: string): Book[] {
		return this.store.allRecords().filter((book) => book.author === author)
	}

	getInStock(): Book[] {
		return this.store.allRecords().filter((book) => book.inStock)
	}

	create(data: Omit<Book, 'id' | 'typeName'>): Book {
		const book = Book.create(data)
		this.store.put([book])
		return book
	}
}
```

### State Machines with Records

Use records to represent state machine states:

```ts
interface OrderState extends BaseRecord<'orderState', RecordId<OrderState>> {
	orderId: string
	status: 'pending' | 'confirmed' | 'shipped' | 'delivered'
	createdAt: number
}

const OrderState = createRecordType<OrderState>('orderState', { scope: 'document' })

// Transition states with side effects
store.sideEffects.registerAfterChangeHandler('orderState', (prev, next) => {
	if (prev.status !== next.status) {
		handleStatusChange(prev.status, next.status, next.orderId)
	}
})
```

### Computed Relationships

Model relationships between records using efficient queries:

```ts
// Get all books by a specific author
const authorId = 'author:123'
const authorBooks = store.query.records('book', () => ({
	authorId: { eq: authorId },
}))
```

The store provides a powerful, reactive foundation for managing your application's data. By understanding these patterns and concepts, you can build applications that automatically stay in sync as data changes, while maintaining excellent performance and type safety throughout.
