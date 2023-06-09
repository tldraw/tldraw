# @tldraw/tlstore

`tlstore` is a library for creating and managing data.

> In this library, a "record" is an object that is stored under a typed id.

`tlstore` is used by [tldraw](https://www.tldraw.com) to store its data.

It is designed to be used with `tlstate` (@tldraw/tlstate).

# Usage

First create types for your records.

```ts
interface Book extends BaseRecord<'book'> {
	title: string
	author: ID<Author>
	numPages: number
}

interface Author extends BaseRecord<'author'> {
	name: string
	isPseudonym: boolean
}
```

Then create your `RecordType` instances.

```ts
const Book = createRecordType<Book>('book')

const Author = createRecordType<Author>('author').withDefaultProperties(() => ({
	isPseudonym: false,
}))
```

Then create your `RecordStore` instance.

```ts
const store = new RecordStore<Book | Author>()
```

Then you can create records, add them to the store, update, and remove them.

```ts
const tolkeinId = Author.createCustomId('tolkein')

store.put([
	Author.create({
		id: jrrTolkeinId,
		name: 'J.R.R Tolkein',
	}),
])

store.update(tolkeinId, (author) => ({
	...author,
	name: 'DJJ Tolkz',
	isPseudonym: true,
}))

store.remove(tolkeinId)
```

---

# API

## `RecordStore`

The `RecordStore` class is the main class of the library.

```ts
const store = new RecordStore()
```

### `put(records: R[]): void`

Add some records to the store. It's an error if they already exist.

```ts
const record = Author.create({
	name: 'J.R.R Tolkein',
	id: Author.createCustomId('tolkein'),
})

store.put([record])
```

### `update(id: ID<R>, updater: (record: R) => R): void`

Update a record. To update multiple records at once, use the `update` method of the `TypedRecordStore` class.

```ts
const id = Author.createCustomId('tolkein')

store.update(id, (r) => ({ ...r, name: 'Jimmy Tolks' }))
```

### `remove(ids: ID<R>[]): void`

Remove some records from the store via their ids.

```ts
const id = Author.createCustomId('tolkein')

store.remove([id])
```

### `get(id: ID<R>): R`

Get the value of a store record by its id.

```ts
const id = Author.createCustomId('tolkein')

const result = store.get(id)
```

### `allRecords(): R[]`

Get an array of all values in the store.

```ts
const results = store.allRecords()
```

### `clear(): void`

Remove all records from the store.

```ts
store.clear()
```

### `has(id: ID<R>): boolean`

Get whether the record store has an record stored under the given id.

```ts
const id = Author.createCustomId('tolkein')

const result = store.has(id)
```

### `serialize(filter?: (record: R) => boolean): RecordStoreSnapshot<R>`

Opposite of `deserialize`. Creates a JSON payload from the record store.

```ts
const serialized = store.serialize()
```

```ts
const serialized = store.serialize((record) => record.name === 'J.R.R Tolkein')
```

### `deserialize(snapshot: RecordStoreSnapshot<R>): void`

Opposite of `serialize`. Replace the store's current records with records as defined by a simple JSON structure into the stores.

```ts
const serialized = { ... }

store.deserialize(serialized)
```

### `listen(listener: ((entry: HistoryEntry) => void): () => void`

Add a new listener to the store The store will call the function each time the history changes. Returns a function to remove the listener.

```ts
store.listen((entry) => doSomethingWith(entry))
```

### `mergeRemoteChanges(fn: () => void): void`

Merge changes from a remote source without triggering listeners.

```ts
store.mergeRemoteChanges(() => {
	store.put(recordsFromRemoteSource)
})
```

### `createDerivationCache(name: string, derive: ((record: R) => R | undefined)): DerivationCache<R>`

Create a new derivation cache.

```ts
const derivationCache = createDerivationCache('popular_authors', (record) => {
	return record.popularity > 62 ? record : undefined
})
```

---

## `RecordType`

The `RecordType` class is used to define the structure of a record.

```ts
const recordType = new RecordType('author', () => ({ living: true }))
```

`RecordType` instances are most often created with `createRecordType`.

### `create(properties: Pick<R, RequiredProperties> & Omit<Partial<R>, RequiredProperties>): R`

Create a new record of this type.

```ts
const record = recordType.create({ name: 'J.R.R Tolkein' })
```

### `clone(record: R): R`

Clone a record of this type.

```ts
const record = recordType.create({ name: 'J.R.R Tolkein' })

const clone = recordType.clone(record)
```

### `createId(): ID<R>`

Create an Id for a record of this type.

```ts
const id = recordType.createId()
```

### `createCustomId(id: string): ID<R>`

Create a custom Id for a record of this type.

```ts
const id = recordType.createCustomId('tolkein')
```

### `isInstance`

Check if a value is an instance of this record type.

```ts
const record = recordType.create({ name: 'J.R.R Tolkein' })

const result1 = recordType.isInstance(record) // true
const result2 = recordType.isInstance(someOtherRecord) // false
```

### `isId`

Check if a value is an id for a record of this type.

```ts
const id = recordType.createCustomId('tolkein')

const result1 = recordType.isId(id) // true
const result2 = recordType.isId(someOtherId) // false
```

### `withDefaultProperties`

Create a new record type with default properties.

```ts
const youngLivingAuthor = new RecordType('author', () => ({ age: 28, living: true }))

const oldDeadAuthor = recordType.withDefaultProperties({ age: 93, living: false })
```

## `RecordStoreQueries`

TODO

## Helpers

### `executeQuery`

TODO

### `DerivationCache`

The `DerivationCache` class is used to create a cache of derived records.

```ts
const derivationCache = new DerivationCache('popular_authors', (record) => {
	return record.popularity > 62 ? record : undefined
})
```

### `createRecordType`

A helper used to create a new `RecordType` instance with no default properties.

```ts
const recordType = createRecordType('author'))
```

### `assertIdType`

A helper used to assert that a value is an id for a record of a given type.

```ts
const id = recordType.createCustomId('tolkein')

assertIdType(id, recordType)
```

---

## Types

### `ID`

A type used to represent a record's id.

```ts
const id: ID<Author> = Author.createCustomId('tolkein')
```

### `BaseRecord`

A `BaseRecord` is a record that has an id and a type. It is the base type for all records.

```ts
type AuthorRecord extends BaseRecord<"author"> {
  name: string
  age: number
  living: boolean
}
```

### `AllRecords`

A helper to get the type of all records in a record store.

```ts
type AllAuthorRecords = AllRecords<RecordStore<Author>>
```

### `RecordsDiff`

A diff describing the changes to a record.

### `CollectionDiff`

A diff describing the changes to a collection.

## License

The source code in this repository (as well as our 2.0+ distributions and releases) are currently licensed under Apache-2.0. These licenses are subject to change in our upcoming 2.0 release. If you are planning to use tldraw in a commercial product, please reach out at [hello@tldraw.com](mailto://hello@tldraw.com).
